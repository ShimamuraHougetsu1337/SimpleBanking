import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/users/entities/user.entity';
import { ReconciliationCron } from '../jobs/reconciliation.cron';

@ApiTags('Admin — Reconciliation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
@Controller('admin/reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationCron: ReconciliationCron) {}

  /**
   * Retrieves a paginated list of past reconciliation reports.
   * Accessible by SUPERADMIN and MANAGER roles only.
   */
  @Get('reports')
  @ApiOperation({ summary: 'Get paginated list of reconciliation reports (Admin/Manager only)' })
  async getReports(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.reconciliationCron.getReports(pageNum, limitNum);
  }

  /**
   * Manually triggers a balance reconciliation check immediately.
   * Accessible by SUPERADMIN and MANAGER roles only.
   */
  @Post('trigger')
  @ApiOperation({ summary: 'Trigger manual balance reconciliation (Admin/Manager only)' })
  async triggerReconciliation() {
    return this.reconciliationCron.runReconciliation();
  }
}
