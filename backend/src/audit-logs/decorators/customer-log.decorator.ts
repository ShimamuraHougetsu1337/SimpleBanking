import { SetMetadata } from '@nestjs/common';
import { CustomerAuditAction } from '../enums/customer-audit-action.enum';

export const CUSTOMER_LOG_KEY = 'customerLog';

export const CustomerLog = (action: CustomerAuditAction) =>
  SetMetadata(CUSTOMER_LOG_KEY, action);
