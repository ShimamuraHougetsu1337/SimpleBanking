/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AdminAuditLogsService } from '@/audit-logs/admin-audit-logs.service';
import { CustomerAuditLogsService } from '@/audit-logs/customer-audit-logs.service';
import { AdminAuditAction } from '@/audit-logs/enums/admin-audit-action.enum';
import { CustomerAuditAction } from '@/audit-logs/enums/customer-audit-action.enum';
import { AuditStatus } from '@/audit-logs/enums/audit-status.enum';
import { ADMIN_LOG_KEY } from '@/audit-logs/decorators/admin-log.decorator';
import { CUSTOMER_LOG_KEY } from '@/audit-logs/decorators/customer-log.decorator';
import { AUDIT_LOGIN_KEY } from '@/audit-logs/decorators/audit-login.decorator';
import { AuditContextHelper } from '@/audit-logs/helpers/audit-context.helper';
import { AuditMetadataBuilder } from '@/audit-logs/helpers/audit-metadata.builder';
import { AuditLoginHandler } from '@/audit-logs/helpers/audit-login.handler';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminAuditLogsService: AdminAuditLogsService,
    private readonly customerAuditLogsService: CustomerAuditLogsService,
    private readonly auditLoginHandler: AuditLoginHandler,
  ) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const adminActionTag = this.reflector.get<AdminAuditAction | 'UPDATE_USER_STATUS' | 'UPDATE_ACCOUNT_STATUS'>(
      ADMIN_LOG_KEY,
      context.getHandler(),
    );
    const customerAction = this.reflector.get<CustomerAuditAction>(CUSTOMER_LOG_KEY, context.getHandler());
    const isLoginAudit = this.reflector.get<boolean>(AUDIT_LOGIN_KEY, context.getHandler());

    if (!adminActionTag && !customerAction && !isLoginAudit) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const ctx = AuditContextHelper.extractFromRequest(req);

    // Resolve admin action động (UPDATE_USER_STATUS → LOCK_USER / UNLOCK_USER, ...)
    const adminAction: AdminAuditAction | null = adminActionTag
      ? AuditContextHelper.resolveDynamicAdminAction(adminActionTag, ctx.body)
      : null;

    return next.handle().pipe(
      tap(async (responseData: unknown) => {
        // --- Login / Logout ---
        if (isLoginAudit) {
          await this.auditLoginHandler.handleSuccess(responseData, req, ctx.ip ?? '');
          return;
        }

        // --- Admin Actions ---
        if (adminAction) {
          await this.adminAuditLogsService.log({
            adminId: ctx.userId,
            adminName: ctx.userName,
            adminEmail: ctx.userEmail,
            action: adminAction,
            status: AuditStatus.SUCCESS,
            metadata: AuditMetadataBuilder.buildAdminSuccessMetadata(adminAction, ctx, responseData as Record<string, unknown>),
            ipAddress: ctx.ip,
            userAgent: ctx.userAgent,
          });
        }

        // --- Customer Actions ---
        if (customerAction) {
          const transactionId = AuditContextHelper.extractTransactionId(customerAction, responseData);
          await this.customerAuditLogsService.log({
            customerId: ctx.userId,
            customerName: ctx.userName,
            customerEmail: ctx.userEmail,
            action: customerAction,
            status: AuditStatus.SUCCESS,
            transactionId,
            // Luôn ghi lại schema chuẩn mới
            metadata: AuditMetadataBuilder.buildCustomerSuccessMetadata(customerAction, ctx, responseData as Record<string, unknown> | null),
            ipAddress: ctx.ip,
            userAgent: ctx.userAgent,
          });
        }
      }),
      catchError(async (err: Error) => {
        // --- Login / Logout Failed ---
        if (isLoginAudit) {
          await this.auditLoginHandler.handleFailed(req, err, ctx.ip ?? '');
        }
        // --- Admin Action Failed ---
        else if (adminAction) {
          await this.adminAuditLogsService.log({
            adminId: ctx.userId,
            adminName: ctx.userName,
            adminEmail: ctx.userEmail,
            action: adminAction,
            status: AuditStatus.FAILED,
            metadata: AuditMetadataBuilder.buildAdminFailMetadata(adminAction, ctx, err),
            ipAddress: ctx.ip,
            userAgent: ctx.userAgent,
          });
        }
        // --- Customer Action Failed ---
        else if (customerAction) {
          await this.customerAuditLogsService.log({
            customerId: ctx.userId,
            customerName: ctx.userName,
            customerEmail: ctx.userEmail,
            action: customerAction,
            status: AuditStatus.FAILED,
            transactionId: null,
            metadata: AuditMetadataBuilder.buildCustomerFailMetadata(customerAction, ctx, err),
            ipAddress: ctx.ip,
            userAgent: ctx.userAgent,
          });
        }
        throw err;
      }),
    );
  }
}
