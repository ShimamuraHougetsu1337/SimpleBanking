import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { User, UserRole } from '@/users/entities/user.entity';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { CustomerAuditLogsService } from './customer-audit-logs.service';
import { GetAdminAuditLogsQueryDto } from './dto/get-admin-audit-logs-query.dto';
import { GetCustomerAuditLogsQueryDto } from './dto/get-customer-audit-logs-query.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(
    private readonly adminAuditLogsService: AdminAuditLogsService,
    private readonly customerAuditLogsService: CustomerAuditLogsService,
  ) {}

  @Get('admin')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get admin audit logs (SuperAdmin & Manager only)' })
  async getAdminLogs(
    @Query() query: GetAdminAuditLogsQueryDto,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.MANAGER) {
      return this.adminAuditLogsService.findAll(query, [UserRole.TELLER], [user.id]);
    }
    return this.adminAuditLogsService.findAll(query);
  }

  @Get('customer')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get customer audit logs (SuperAdmin & Manager only)' })
  async getCustomerLogs(@Query() query: GetCustomerAuditLogsQueryDto) {
    return this.customerAuditLogsService.findAll(query);
  }
}
