import { AdminAuditAction } from '../enums/admin-audit-action.enum';
import { AuditStatus } from '../enums/audit-status.enum';

export class CreateAdminAuditLogDto {
  adminId?: string | null;
  adminName?: string | null;
  adminEmail?: string | null;
  action: AdminAuditAction;
  status: AuditStatus;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}
