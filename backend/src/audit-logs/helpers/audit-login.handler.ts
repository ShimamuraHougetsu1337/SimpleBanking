/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { AdminAuditLogsService } from '@/audit-logs/admin-audit-logs.service';
import { CustomerAuditLogsService } from '@/audit-logs/customer-audit-logs.service';
import { UsersService } from '@/users/users.service';
import { AdminAuditAction } from '@/audit-logs/enums/admin-audit-action.enum';
import { CustomerAuditAction } from '@/audit-logs/enums/customer-audit-action.enum';
import { AuditStatus } from '@/audit-logs/enums/audit-status.enum';
import { UserRole } from '@/users/entities/user.entity';
import { AuditMetadataBuilder } from './audit-metadata.builder';

/**
 * Xử lý toàn bộ logic đặc biệt của audit login/logout.
 *
 * Login/logout có đặc thù riêng:
 * - Khi login thành công: thông tin user được lấy từ response body (vì chưa có session).
 * - Khi login thất bại: phải tra cứu DB để xác định role của email được nhập vào,
 *   từ đó quyết định ghi vào bảng admin hay customer.
 * - Logout: thông tin user lấy từ JWT đã authenticated.
 */
@Injectable()
export class AuditLoginHandler {
  constructor(
    private readonly adminAuditLogsService: AdminAuditLogsService,
    private readonly customerAuditLogsService: CustomerAuditLogsService,
    private readonly usersService: UsersService,
  ) {}

  async handleSuccess(responseData: any, req: any, ip: string): Promise<void> {
    const isLogout = (req.url as string).includes('logout');
    if (isLogout) {
      await this.logLogout(req.user, ip);
      return;
    }
    await this.logLoginSuccess(responseData?.user, ip);
  }

  async handleFailed(req: any, err: Error, ip: string): Promise<void> {
    const isLogout = (req.url as string).includes('logout');
    // Logout thất bại (401) đã được xử lý ở tầng frontend — không cần ghi log bảo mật
    if (isLogout) return;

    await this.logLoginFailed(req.body?.email as string | undefined, err, ip);
  }

  private async logLoginSuccess(user: any, ip: string): Promise<void> {
    const isCustomer = user.role === UserRole.CUSTOMER;
    const action = isCustomer ? CustomerAuditAction.LOGIN_SUCCESS : AdminAuditAction.LOGIN_SUCCESS;
    const ctx = { ip, userId: user.id, userRole: user.role, userEmail: user.email, body: {}, params: {}, userAgent: null, userName: user.fullName };

    if (!isCustomer) {
      const ext = AuditMetadataBuilder.buildAdminSuccess(action as AdminAuditAction, ctx, user as Record<string, any>);
      await this.adminAuditLogsService.log({
        action: action as AdminAuditAction,
        adminId: user.id,
        adminName: user.fullName,
        adminEmail: user.email,
        status: AuditStatus.SUCCESS,
        ipAddress: ip,
        entity: ext.entity,
        entityId: ext.entityId,
        beforeData: ext.beforeData,
        afterData: ext.afterData,
      });
    } else {
      const ext = AuditMetadataBuilder.buildCustomerSuccess(action as CustomerAuditAction, ctx, user as Record<string, any>);
      await this.customerAuditLogsService.log({
        action: action as CustomerAuditAction,
        customerId: user.id,
        customerName: user.fullName,
        customerEmail: user.email,
        status: AuditStatus.SUCCESS,
        ipAddress: ip,
        entity: ext.entity,
        entityId: ext.entityId,
        beforeData: ext.beforeData,
        afterData: ext.afterData,
      });
    }
  }

  private async logLogout(user: any, ip: string): Promise<void> {
    const isCustomer = user.role === UserRole.CUSTOMER;
    const action = isCustomer ? CustomerAuditAction.LOGOUT : AdminAuditAction.LOGOUT;
    const ctx = { ip, userId: user.id, userRole: user.role, userEmail: user.email, body: {}, params: {}, userAgent: null, userName: user.fullName };

    if (!isCustomer) {
      const ext = AuditMetadataBuilder.buildAdminSuccess(action as AdminAuditAction, ctx, user as Record<string, any>);
      await this.adminAuditLogsService.log({
        action: action as AdminAuditAction,
        adminId: user.id,
        adminName: user.fullName,
        adminEmail: user.email,
        status: AuditStatus.SUCCESS,
        ipAddress: ip,
        entity: ext.entity,
        entityId: ext.entityId,
        beforeData: ext.beforeData,
        afterData: ext.afterData,
      });
    } else {
      const ext = AuditMetadataBuilder.buildCustomerSuccess(action as CustomerAuditAction, ctx, user as Record<string, any>);
      await this.customerAuditLogsService.log({
        action: action as CustomerAuditAction,
        customerId: user.id,
        customerName: user.fullName,
        customerEmail: user.email,
        status: AuditStatus.SUCCESS,
        ipAddress: ip,
        entity: ext.entity,
        entityId: ext.entityId,
        beforeData: ext.beforeData,
        afterData: ext.afterData,
      });
    }
  }

  private async logLoginFailed(attemptedEmail: string | undefined, err: Error, ip: string): Promise<void> {
    // Tra cứu role để quyết định ghi vào bảng nào
    let foundUserId: string | null = null;
    let foundUserName: string | null = null;
    let foundRole: UserRole | null = null;

    if (attemptedEmail) {
      const found = await this.usersService.findByEmail(attemptedEmail).catch(() => null);
      foundUserId = found?.id ?? null;
      foundUserName = found?.fullName ?? null;
      foundRole = found?.role ?? null;
    }

    const isAdmin = foundRole && foundRole !== UserRole.CUSTOMER;
    const action = isAdmin ? AdminAuditAction.LOGIN_FAILED : CustomerAuditAction.LOGIN_FAILED;
    const ctx = { ip, userEmail: attemptedEmail ?? null, userId: foundUserId, userRole: foundRole, body: {}, params: {}, userAgent: null, userName: foundUserName };

    if (isAdmin) {
      const ext = AuditMetadataBuilder.buildAdminFail(action as AdminAuditAction, ctx, err);
      await this.adminAuditLogsService.log({
        status: AuditStatus.FAILED,
        action: action as AdminAuditAction,
        adminId: foundUserId,
        adminName: foundUserName,
        adminEmail: attemptedEmail ?? null,
        ipAddress: ip,
        entity: ext.entity,
        entityId: ext.entityId,
        beforeData: ext.beforeData,
        afterData: ext.afterData,
      });
    } else {
      const ext = AuditMetadataBuilder.buildCustomerFail(action as CustomerAuditAction, ctx, err);
      await this.customerAuditLogsService.log({
        status: AuditStatus.FAILED,
        action: action as CustomerAuditAction,
        customerId: foundUserId,
        customerName: foundUserName,
        customerEmail: attemptedEmail ?? null,
        ipAddress: ip,
        entity: ext.entity,
        entityId: ext.entityId,
        beforeData: ext.beforeData,
        afterData: ext.afterData,
      });
    }
  }
}
