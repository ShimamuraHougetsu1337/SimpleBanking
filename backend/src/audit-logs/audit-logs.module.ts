import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { CustomerAuditLog } from './entities/customer-audit-log.entity';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { CustomerAuditLogsService } from './customer-audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { UsersModule } from '@/users/users.module';

import { AuditLoginHandler } from './helpers/audit-login.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminAuditLog, CustomerAuditLog]),
    UsersModule,
  ],
  controllers: [AuditLogsController],
  providers: [
    AdminAuditLogsService,
    CustomerAuditLogsService,
    AuditLoginHandler,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AdminAuditLogsService, CustomerAuditLogsService],
})
export class AuditLogsModule {}
