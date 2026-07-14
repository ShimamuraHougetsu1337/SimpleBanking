/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { AdminAuditAction } from '@/audit-logs/enums/admin-audit-action.enum';
import { CustomerAuditAction } from '@/audit-logs/enums/customer-audit-action.enum';
import type { AuditRequestContext } from './audit-context.helper';

export interface AuditExtractResult {
  entity: string | null;
  entityId: string | null;
  beforeData: Record<string, any> | null;
  afterData: Record<string, any> | null;
}

export class AuditMetadataBuilder {
  /**
   * Extract audit log properties for Admin actions (Success path)
   */
  static buildAdminSuccess(
    action: AdminAuditAction,
    ctx: AuditRequestContext,
    responseData: Record<string, any> | null,
  ): AuditExtractResult {
    let entity: string | null = null;
    let entityId: string | null = null;
    let beforeData: Record<string, any> | null = null;
    let afterData: Record<string, any> | null = null;

    // Determine target entity type
    if (
      action === AdminAuditAction.LOCK_USER ||
      action === AdminAuditAction.UNLOCK_USER ||
      action === AdminAuditAction.CREATE_USER ||
      action === AdminAuditAction.DELETE_USER ||
      action === AdminAuditAction.REACTIVATE_USER_OTP ||
      action === AdminAuditAction.LOGIN_SUCCESS ||
      action === AdminAuditAction.LOGOUT
    ) {
      entity = 'user';
    } else if (
      action === AdminAuditAction.FREEZE_ACCOUNT ||
      action === AdminAuditAction.UNFREEZE_ACCOUNT ||
      action === AdminAuditAction.ADMIN_DEPOSIT ||
      action === AdminAuditAction.ADMIN_WITHDRAW ||
      action === AdminAuditAction.ADMIN_TRANSFER ||
      action === AdminAuditAction.UPDATE_ACCOUNT_DAILY_LIMIT
    ) {
      entity = 'account';
    } else if (
      action === AdminAuditAction.APPROVE_TRANSACTION ||
      action === AdminAuditAction.REJECT_TRANSACTION
    ) {
      entity = 'transaction';
    } else if (action === AdminAuditAction.UPDATE_SETTINGS) {
      entity = 'system_settings';
    }

    // Determine entityId
    if (responseData?.id) {
      entityId = responseData.id;
    } else if (ctx.params?.id) {
      entityId = ctx.params.id;
    } else if (responseData?.accountId) {
      entityId = responseData.accountId;
    }

    // Determine beforeData / afterData
    switch (action) {
      case AdminAuditAction.LOCK_USER:
      case AdminAuditAction.UNLOCK_USER:
      case AdminAuditAction.FREEZE_ACCOUNT:
      case AdminAuditAction.UNFREEZE_ACCOUNT:
        beforeData = { status: responseData?.oldStatus ?? null };
        afterData = { status: responseData?.status ?? null };
        break;

      case AdminAuditAction.ADMIN_DEPOSIT:
      case AdminAuditAction.ADMIN_WITHDRAW:
      case AdminAuditAction.ADMIN_TRANSFER:
        beforeData = {};
        afterData = {
          accountId: ctx.params?.id ?? null,
          toAccountNumber: ctx.body?.toAccountNumber ?? null,
          amount: ctx.body?.amount ?? null,
          description: ctx.body?.description ?? null,
          transactionId: responseData?.id ?? null,
          status: responseData?.status ?? null,
        };
        break;

      case AdminAuditAction.APPROVE_TRANSACTION:
      case AdminAuditAction.REJECT_TRANSACTION:
        beforeData = { status: 'pending' };
        afterData = {
          requestId: ctx.params?.id ?? null,
          transactionId: responseData?.id ?? null,
          status: responseData?.status ?? null,
        };
        break;

      case AdminAuditAction.UPDATE_SETTINGS:
        beforeData = (responseData?.oldValues as Record<string, any>) ?? {};
        afterData = (responseData?.newValues as Record<string, any>) ?? {};
        break;

      case AdminAuditAction.CREATE_USER:
        beforeData = null;
        afterData = {
          id: responseData?.id ?? null,
          fullName: responseData?.fullName ?? null,
          email: responseData?.email ?? null,
          role: responseData?.role ?? null,
        };
        break;

      case AdminAuditAction.DELETE_USER:
        beforeData = {};
        afterData = { deleted: true };
        break;

      case AdminAuditAction.REACTIVATE_USER_OTP:
        beforeData = {};
        afterData = { otpReactivated: true };
        break;

      case AdminAuditAction.UPDATE_ACCOUNT_DAILY_LIMIT:
        beforeData = { dailyLimit: responseData?.oldDailyLimit ?? null };
        afterData = { dailyLimit: responseData?.dailyLimit ?? null };
        break;

      case AdminAuditAction.LOGIN_SUCCESS:
        beforeData = {};
        afterData = { success: true };
        break;

      case AdminAuditAction.LOGOUT:
        beforeData = {};
        afterData = { logout: true };
        break;

      default:
        beforeData = {};
        afterData = responseData ? { ...responseData } : {};
        break;
    }

    return { entity, entityId, beforeData, afterData };
  }

  /**
   * Extract audit log properties for Customer actions (Success path)
   */
  static buildCustomerSuccess(
    action: CustomerAuditAction,
    ctx: AuditRequestContext,
    responseData: Record<string, any> | null,
  ): AuditExtractResult {
    let entity: string | null = null;
    let entityId: string | null = null;
    let beforeData: Record<string, any> | null = null;
    let afterData: Record<string, any> | null = null;

    // Determine target entity type
    if (
      action === CustomerAuditAction.LOGIN_SUCCESS ||
      action === CustomerAuditAction.LOGOUT ||
      action === CustomerAuditAction.UPDATE_PROFILE ||
      action === CustomerAuditAction.CHANGE_PASSWORD
    ) {
      entity = 'user';
    } else if (
      action === CustomerAuditAction.TRANSFER ||
      action === CustomerAuditAction.DEPOSIT ||
      action === CustomerAuditAction.WITHDRAW
    ) {
      entity = 'transaction';
    }

    // Determine entityId
    if (responseData?.id) {
      entityId = responseData.id;
    } else if (ctx.userId) {
      entityId = ctx.userId;
    }

    // Determine beforeData / afterData
    switch (action) {
      case CustomerAuditAction.UPDATE_PROFILE: {
        const resObj = responseData as {
          fullName?: string;
          email?: string;
          phoneNumber?: string;
          oldValues?: {
            fullName?: string;
            email?: string;
            phoneNumber?: string;
          };
        } | null;
        beforeData = {
          fullName: resObj?.oldValues?.fullName ?? ctx.userName ?? null,
          email: resObj?.oldValues?.email ?? ctx.userEmail ?? null,
          phoneNumber: resObj?.oldValues?.phoneNumber ?? null,
        };
        afterData = {
          fullName: resObj?.fullName ?? ctx.body?.fullName ?? null,
          email: resObj?.email ?? ctx.body?.email ?? null,
          phoneNumber: resObj?.phoneNumber ?? ctx.body?.phoneNumber ?? null,
        };
        break;
      }

      case CustomerAuditAction.CHANGE_PASSWORD:
        beforeData = {};
        afterData = { passwordChanged: true, changedAt: new Date().toISOString() };
        break;

      case CustomerAuditAction.TRANSFER:
        beforeData = {};
        afterData = {
          fromAccountId: ctx.body?.fromAccountId ?? null,
          toAccountNumber: ctx.body?.toAccountNumber ?? null,
          amount: ctx.body?.amount ?? null,
          transactionId: responseData?.id ?? null,
        };
        break;

      case CustomerAuditAction.DEPOSIT:
      case CustomerAuditAction.WITHDRAW:
        beforeData = {};
        afterData = {
          accountId: ctx.body?.accountId ?? null,
          amount: ctx.body?.amount ?? null,
          transactionId: responseData?.id ?? null,
        };
        break;

      case CustomerAuditAction.LOGIN_SUCCESS:
        beforeData = {};
        afterData = { success: true };
        break;

      case CustomerAuditAction.LOGOUT:
        beforeData = {};
        afterData = { logout: true };
        break;

      default:
        beforeData = {};
        afterData = responseData ? { ...responseData } : {};
        break;
    }

    return { entity, entityId, beforeData, afterData };
  }

  /**
   * Extract audit log properties for Admin actions (Failure path)
   */
  static buildAdminFail(
    action: AdminAuditAction,
    ctx: AuditRequestContext,
    err: Error,
  ): AuditExtractResult {
    const successResult = this.buildAdminSuccess(action, ctx, null);
    successResult.beforeData = successResult.beforeData ?? {};
    successResult.afterData = {
      status: 'FAILED',
      errorMessage: err.message,
    };
    return successResult;
  }

  /**
   * Extract audit log properties for Customer actions (Failure path)
   */
  static buildCustomerFail(
    action: CustomerAuditAction,
    ctx: AuditRequestContext,
    err: Error,
  ): AuditExtractResult {
    const successResult = this.buildCustomerSuccess(action, ctx, null);
    successResult.beforeData = successResult.beforeData ?? {};
    successResult.afterData = {
      status: 'FAILED',
      errorMessage: err.message,
    };
    return successResult;
  }
}
