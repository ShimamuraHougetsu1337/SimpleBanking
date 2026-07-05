import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';

import { AdminModule } from '@/admin/admin.module';
import { AuditLogsModule } from '@/audit-logs/audit-logs.module';

@Module({
  imports: [AdminModule, AuditLogsModule],
  providers: [TasksService],
})
export class TasksModule {}
