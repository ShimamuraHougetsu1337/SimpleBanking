import { AdminAuditAction } from '@/audit-logs/enums/admin-audit-action.enum';
import { CustomerAuditAction } from '@/audit-logs/enums/customer-audit-action.enum';
import type { AuditRequestContext } from './audit-context.helper';
import { HttpException } from '@nestjs/common';

export interface StandardAuditSchema {
  timestamp: string;
  action: string;
  actor: {
    type: string | null;
    id: string | null;
  };
  context: {
    ip_address: string | null;
    user_agent: string | null;
  };
  data_changes: {
    old_data: Record<string, unknown>;
    new_data: Record<string, unknown>;
  };
  outcome: {
    status: 'SUCCESS' | 'FAILED';
    error_code: string | null;
    error_message: string | null;
  };
  [key: string]: unknown;
}

export class AuditMetadataBuilder {
  static createBaseSchema(
    action: string,
    ctx: Partial<AuditRequestContext>,
    status: 'SUCCESS' | 'FAILED',
    err?: Error
  ): StandardAuditSchema {
    return {
      timestamp: new Date().toISOString(),
      action,
      actor: {
        type: ctx.userRole ? ctx.userRole.toUpperCase() : null,
        id: ctx.userId ?? null,
      },
      context: {
        ip_address: ctx.ip ?? null,
        user_agent: ctx.userAgent ?? null,
      },
      data_changes: {
        old_data: {},
        new_data: {},
      },
      outcome: {
        status,
        error_code: err
          ? err instanceof HttpException
            ? err.getStatus().toString()
            : err && typeof err === 'object' && 'status' in err && typeof (err as Record<string, unknown>).status === 'number'
              ? String((err as Record<string, unknown>).status)
              : err && typeof err === 'object' && 'statusCode' in err && typeof (err as Record<string, unknown>).statusCode === 'number'
                ? String((err as Record<string, unknown>).statusCode)
                : '500'
          : null,
        error_message: err ? err.message : null,
      },
    };
  }

  static buildAdminSuccessMetadata(
    action: AdminAuditAction,
    ctx: AuditRequestContext,
    responseData: Record<string, unknown> | null,
  ): StandardAuditSchema {
    const meta = this.createBaseSchema(action, ctx, 'SUCCESS');
    switch (action) {
      case AdminAuditAction.LOCK_USER:
      case AdminAuditAction.UNLOCK_USER:
      case AdminAuditAction.FREEZE_ACCOUNT:
      case AdminAuditAction.UNFREEZE_ACCOUNT:
        meta.data_changes.old_data = { status: responseData?.['status'] === 'locked' ? 'active' : 'locked' };
        meta.data_changes.new_data = { status: responseData?.['status'] ?? null };
        break;
      case AdminAuditAction.ADMIN_DEPOSIT:
        meta.data_changes.new_data = {
          amount: ctx.body['amount'] ?? null,
          description: ctx.body['description'] ?? null,
          balance: responseData?.['balance'] ?? null,
        };
        break;
      case AdminAuditAction.UPDATE_SETTINGS:
        meta.data_changes.old_data = (responseData as Record<string, unknown>)?.['oldValues'] as Record<string, unknown> ?? {};
        meta.data_changes.new_data = (responseData as Record<string, unknown>)?.['newValues'] as Record<string, unknown> ?? {};
        break;
      default:
        break;
    }
    return meta;
  }

  static buildCustomerSuccessMetadata(
    action: CustomerAuditAction,
    ctx: AuditRequestContext,
    responseData?: Record<string, unknown> | null,
  ): StandardAuditSchema {
    const meta = this.createBaseSchema(action, ctx, 'SUCCESS');
    switch (action) {
      case CustomerAuditAction.UPDATE_PROFILE:
        meta.data_changes.new_data = { fullName: ctx.body['fullName'] ?? null };
        break;
      case CustomerAuditAction.TRANSFER:
        meta.data_changes.new_data = {
          fromAccountId: ctx.body['fromAccountId'] ?? null,
          toAccountNumber: ctx.body['toAccountNumber'] ?? null,
          amount: ctx.body['amount'] ?? null,
          transactionId: responseData?.['id'] ?? null,
        };
        break;
      case CustomerAuditAction.DEPOSIT:
      case CustomerAuditAction.WITHDRAW:
        meta.data_changes.new_data = {
          accountId: ctx.body['accountId'] ?? null,
          amount: ctx.body['amount'] ?? null,
          transactionId: responseData?.['id'] ?? null,
        };
        break;
      default:
        break;
    }
    return meta;
  }

  static buildAdminFailMetadata(
    action: AdminAuditAction,
    ctx: AuditRequestContext,
    err: Error,
  ): StandardAuditSchema {
    const meta = this.createBaseSchema(action, ctx, 'FAILED', err);
    switch (action) {
      case AdminAuditAction.LOCK_USER:
      case AdminAuditAction.UNLOCK_USER:
      case AdminAuditAction.FREEZE_ACCOUNT:
      case AdminAuditAction.UNFREEZE_ACCOUNT:
        meta.data_changes.new_data = { attemptedStatus: ctx.body['status'] ?? null };
        break;
      case AdminAuditAction.ADMIN_DEPOSIT:
        meta.data_changes.new_data = { attemptedAmount: ctx.body['amount'] ?? null };
        break;
      case AdminAuditAction.UPDATE_SETTINGS:
        meta.data_changes.new_data = { attemptedUpdates: ctx.body['updates'] ?? null };
        break;
      default:
        break;
    }
    return meta;
  }

  static buildCustomerFailMetadata(
    action: CustomerAuditAction,
    ctx: AuditRequestContext,
    err: Error,
  ): StandardAuditSchema {
    const meta = this.createBaseSchema(action, ctx, 'FAILED', err);
    switch (action) {
      case CustomerAuditAction.TRANSFER:
        meta.data_changes.new_data = {
          fromAccountId: ctx.body['fromAccountId'] ?? null,
          toAccountNumber: ctx.body['toAccountNumber'] ?? null,
          attemptedAmount: ctx.body['amount'] ?? null,
        };
        break;
      case CustomerAuditAction.DEPOSIT:
      case CustomerAuditAction.WITHDRAW:
        meta.data_changes.new_data = {
          accountId: ctx.body['accountId'] ?? null,
          attemptedAmount: ctx.body['amount'] ?? null,
        };
        break;
      case CustomerAuditAction.UPDATE_PROFILE:
        meta.data_changes.new_data = { attemptedName: ctx.body['fullName'] ?? null };
        break;
      default:
        break;
    }
    return meta;
  }
}
