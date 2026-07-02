import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule/dist/decorators';
import { CronExpression } from '@nestjs/schedule/dist/enums';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) { }

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
}
