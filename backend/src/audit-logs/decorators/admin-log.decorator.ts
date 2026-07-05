import { SetMetadata } from '@nestjs/common';
import { AdminAuditAction } from '../enums/admin-audit-action.enum';

export const ADMIN_LOG_KEY = 'adminLog';

export const AdminLog = (action: AdminAuditAction | 'UPDATE_USER_STATUS' | 'UPDATE_ACCOUNT_STATUS') =>
  SetMetadata(ADMIN_LOG_KEY, action);
