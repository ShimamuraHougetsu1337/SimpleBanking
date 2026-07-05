import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule/dist/decorators';
import { CronExpression } from '@nestjs/schedule/dist/enums';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SystemSettingsService } from '@/admin/system-settings.service';
import { AdminAuditLogsService } from '@/audit-logs/admin-audit-logs.service';
import { CustomerAuditLogsService } from '@/audit-logs/customer-audit-logs.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly systemSettingsService: SystemSettingsService,
    private readonly adminAuditLogsService: AdminAuditLogsService,
    private readonly customerAuditLogsService: CustomerAuditLogsService,
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleResetDailyLimits(): Promise<void> {
    this.logger.log('Running daily limit reset task...');
    try {
      const result = (await this.dataSource.query(
        'UPDATE accounts SET used_daily_limit = 0;',
      )) as unknown as [unknown, number];
      this.logger.log(`Daily limits reset successfully. Affected rows: ${result?.[1] ?? 'unknown'}`);
    } catch (error) {
      this.logger.error('Failed to reset daily limits', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanupAuditLogs(): Promise<void> {
    this.logger.log('Running audit logs cleanup task...');
    try {
      const adminRetentionDays = await this.systemSettingsService.getSetting<number>('admin_audit_retention_days') || 365;
      const customerRetentionDays = await this.systemSettingsService.getSetting<number>('customer_audit_retention_days') || 180;

      await this.adminAuditLogsService.deleteOlderThan(adminRetentionDays);
      this.logger.log(`Cleaned up admin audit logs older than ${adminRetentionDays} days.`);

      await this.customerAuditLogsService.deleteOlderThan(customerRetentionDays);
      this.logger.log(`Cleaned up customer audit logs older than ${customerRetentionDays} days.`);
    } catch (error) {
      this.logger.error('Failed to clean up audit logs', error);
    }
  }
}
