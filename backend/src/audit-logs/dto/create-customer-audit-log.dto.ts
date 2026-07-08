import { CustomerAuditAction } from '../enums/customer-audit-action.enum';
import { AuditStatus } from '../enums/audit-status.enum';

export class CreateCustomerAuditLogDto {
  customerId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  action: CustomerAuditAction;
  status: AuditStatus;
  transactionId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}
