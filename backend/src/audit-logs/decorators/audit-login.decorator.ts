import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOGIN_KEY = 'auditLogin';

export const AuditLogin = () => SetMetadata(AUDIT_LOGIN_KEY, true);
