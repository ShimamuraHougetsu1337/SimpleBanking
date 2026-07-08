import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
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
import { AdminLog } from '@/audit-logs/decorators/admin-log.decorator';
import { AdminAuditAction } from '@/audit-logs/enums/admin-audit-action.enum';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TELLER, UserRole.MANAGER, UserRole.SUPERADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly systemSettingsService: SystemSettingsService,
  ) { }

  @Get('users')
  @ApiOperation({ summary: 'List all users in the system (Admin only)' })
  async getUsers(
    @Query() query: GetUsersQueryDto,
  ) {
    return this.adminService.getUsers(
      query.page,
      query.limit,
      query.search,
      query.status,
      query.includeDeleted
    );
  }

  @Post('users')
  @Roles(UserRole.SUPERADMIN, UserRole.TELLER)
  @ApiOperation({ summary: 'Create a new user (SuperAdmin creates admin, Teller creates customer)' })
  @AdminLog(AdminAuditAction.CREATE_USER)
  async createUser(@Body() dto: CreateUserAdminDto, @CurrentUser() admin: User) {
    if (admin.role === UserRole.SUPERADMIN) {
      if (dto.role === UserRole.CUSTOMER) {
        throw new ForbiddenException('SuperAdmin cannot create customer accounts');
      }
    } else if (admin.role === UserRole.TELLER) {
      if (dto.role !== UserRole.CUSTOMER) {
        throw new ForbiddenException('Teller can only create customer accounts');
      }
    } else {
      throw new ForbiddenException('You are not allowed to create users');
    }

    return await this.adminService.createUser(dto);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get details of a specific user (Admin only)' })
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Lock or unlock a user account (Admin only)' })
  @AdminLog('UPDATE_USER_STATUS')
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() admin: User,
  ) {
    return this.adminService.updateUserStatus(id, dto.status, admin.id);
  }

  @Get('users/:id/history')
  @ApiOperation({ summary: 'Get history of user profile changes' })
  async getUserHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserHistory(id);
  }

  @Delete('users/:id')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Soft delete a user account (SuperAdmin only)' })
  @AdminLog(AdminAuditAction.DELETE_USER)
  async softDeleteUser(@Param('id', ParseUUIDPipe) id: string) {
    await this.adminService.softDeleteUser(id);
    return { message: 'User deleted successfully' };
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

  @Get('accounts/:id/ledger')
  @ApiOperation({ summary: 'Get ledger entries for an account' })
  async getAccountLedger(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminService.getAccountLedger(id);
  }

  @Patch('accounts/:id/status')
  @ApiOperation({ summary: 'Freeze or unfreeze a bank account (Admin only)' })
  @AdminLog('UPDATE_ACCOUNT_STATUS')
  async updateAccountStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateAccountStatus(id, status as AccountStatus);
  }

  @Post('accounts/:id/deposit')
  @Roles(UserRole.TELLER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Deposit money into an account (TELLER/MANAGER)' })
  @AdminLog(AdminAuditAction.ADMIN_DEPOSIT)
  async depositToAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('amount') amount: string,
    @CurrentUser() admin: User,
    @Body('description') description?: string,
  ) {
    return this.adminService.depositToAccount(id, amount, admin.id, description);
  }

  @Post('accounts/:id/withdraw')
  @Roles(UserRole.TELLER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Withdraw money from an account (TELLER/MANAGER)' })
  @AdminLog(AdminAuditAction.ADMIN_WITHDRAW)
  async withdrawFromAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('amount') amount: string,
    @CurrentUser() admin: User,
    @Body('description') description?: string,
  ) {
    return this.adminService.withdrawFromAccount(id, amount, admin.id, description);
  }

  @Post('transaction-requests/:id/approve')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Approve a pending transaction request (MANAGER only)' })
  @AdminLog(AdminAuditAction.APPROVE_TRANSACTION)
  async approveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
  ) {
    return await this.adminService.approveRequest(id, admin.id);
  }

  @Post('transaction-requests/:id/reject')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Reject a pending transaction request (MANAGER only)' })
  @AdminLog(AdminAuditAction.REJECT_TRANSACTION)
  async rejectRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
  ) {
    return await this.adminService.rejectRequest(id, admin.id);
  }

  @Get('transaction-requests')
  @Roles(UserRole.MANAGER, UserRole.SUPERADMIN, UserRole.TELLER)
  @ApiOperation({ summary: 'List all transaction requests (Admin only)' })
  async getTransactionRequests(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @CurrentUser() admin?: User,
  ) {
    const tellerId = admin?.role === UserRole.TELLER ? admin.id : undefined;
    return await this.adminService.getTransactionRequests(
      +page,
      +limit,
      status,
      tellerId,
    );
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
    @CurrentUser() admin?: User,
  ) {
    const tellerId = admin?.role === UserRole.TELLER ? admin.id : undefined;
    return this.adminService.getTransactions(
      +page,
      +limit,
      search,
      startDate,
      endDate,
      type,
      tellerId,
    );
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get all system settings' })
  async getSettings() {
    return this.systemSettingsService.getAllSettings();
  }

  @Patch('settings')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update system settings' })
  @AdminLog(AdminAuditAction.UPDATE_SETTINGS)
  async updateSettings(
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() admin: User,
  ) {
    const result = await this.systemSettingsService.updateSettings(dto.updates, admin.fullName);
    // Interceptor captures the full result (including oldValues/newValues) for audit logging.
    // The API response itself only exposes the updated settings list to the frontend.
    return result;
  }
}
