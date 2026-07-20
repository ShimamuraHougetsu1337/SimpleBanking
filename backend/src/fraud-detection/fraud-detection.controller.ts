import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole, User } from '@/users/entities/user.entity';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { FraudDetectionService } from './fraud-detection.service';
import { GetFraudFlagsQueryDto } from './dto/get-fraud-flags-query.dto';
import { ReviewFraudFlagDto } from './dto/review-fraud-flag.dto';
import { AdminLog } from '@/audit-logs/decorators/admin-log.decorator';
import { AdminAuditAction } from '@/audit-logs/enums/admin-audit-action.enum';

@ApiTags('Fraud Detection')
@Controller('admin/fraud-flags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FraudDetectionController {
  constructor(private readonly fraudDetectionService: FraudDetectionService) {}

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER, UserRole.TELLER)
  @ApiOperation({ summary: 'Get list of flagged suspicious transactions' })
  async getFraudFlags(@Query() query: GetFraudFlagsQueryDto) {
    return this.fraudDetectionService.getFraudFlags(query);
  }

  @Patch(':id/review')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @AdminLog(AdminAuditAction.LOCK_USER)
  @ApiOperation({ summary: 'Review and approve/reject a fraud flag' })
  async reviewFraudFlag(
    @Param('id') id: string,
    @Body() dto: ReviewFraudFlagDto,
    @CurrentUser() adminUser: User,
  ) {
    return this.fraudDetectionService.reviewFraudFlag(id, dto, adminUser);
  }
}
