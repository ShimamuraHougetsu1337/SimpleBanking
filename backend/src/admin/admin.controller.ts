import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { User, UserRole } from '@/users/entities/user.entity';
import { AccountStatus } from '@/accounts/entities/account.entity';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { SystemSettingsService } from './system-settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly systemSettingsService: SystemSettingsService,
  ) { }

  @Get('users')
  @ApiOperation({ summary: 'List all users in the system (Admin only)' })
  async getUsers(@Query() query: GetUsersQueryDto) {
    return this.adminService.getUsers(
      query.page,
      query.limit,
      query.search,
      query.status,
    );
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get details of a specific user (Admin only)' })
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Lock or unlock a user account (Admin only)' })
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() admin: User,
  ) {
    return this.adminService.updateUserStatus(id, dto.status, admin.id);
  }

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get overall dashboard statistics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('accounts')
  @ApiOperation({ summary: 'List all bank accounts (Admin only)' })
  async getAccounts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAccounts(
      +page,
      +limit,
      search,
      status as AccountStatus, // Cast to AccountStatus
    );
  }

  @Patch('accounts/:id/status')
  @ApiOperation({ summary: 'Freeze or unfreeze a bank account (Admin only)' })
  async updateAccountStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateAccountStatus(id, status as AccountStatus);
  }

  @Post('accounts/:id/deposit')
  @ApiOperation({ summary: 'Deposit money into an account (Admin only)' })
  async depositToAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('amount') amount: string,
    @Body('description') description?: string,
  ) {
    return this.adminService.depositToAccount(id, amount, description);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List all transactions (Admin only)' })
  async getTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
  ) {
    return this.adminService.getTransactions(
      +page,
      +limit,
      search,
      startDate,
      endDate,
      type,
    );
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get all system settings' })
  async getSettings() {
    return this.systemSettingsService.getAllSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update system settings' })
  async updateSettings(
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() admin: User,
  ) {
    return this.systemSettingsService.updateSettings(dto.updates, admin.fullName);
  }
}
