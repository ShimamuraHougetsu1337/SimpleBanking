import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/users/entities/user.entity';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { CustomerAuditLogsService } from './customer-audit-logs.service';
import { GetAdminAuditLogsQueryDto } from './dto/get-admin-audit-logs-query.dto';
import { GetCustomerAuditLogsQueryDto } from './dto/get-customer-audit-logs-query.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(
    private readonly adminAuditLogsService: AdminAuditLogsService,
    private readonly customerAuditLogsService: CustomerAuditLogsService,
  ) {}

  @Get('admin')
  @ApiOperation({ summary: 'Get admin audit logs (Admin only)' })
  async getAdminLogs(@Query() query: GetAdminAuditLogsQueryDto) {
    return this.adminAuditLogsService.findAll(query);
  }

  @Get('customer')
  @ApiOperation({ summary: 'Get customer audit logs (Admin only)' })
  async getCustomerLogs(@Query() query: GetCustomerAuditLogsQueryDto) {
    return this.customerAuditLogsService.findAll(query);
  }
}
