import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UsersService } from '@/users/users.service';
import { UserStatus } from '@/users/entities/user.entity';
import { AccountsService } from '@/accounts/accounts.service';
import { TransactionsService } from '@/transactions/services/transactions.service';
import { TransactionRequestsService } from '@/transactions/services/transaction-requests.service';
import { ReversalService } from '@/transactions/services/reversal.service';
import { LedgerService } from '@/transactions/services/ledger.service';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';
import { SystemAccount } from '@/common/enums/system-account.enum';
import { UserHistoryService } from '@/users/services/user-history.service';
import * as crypto from 'crypto';
import Decimal from 'decimal.js';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { User, UserRole } from '@/users/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly accountsService: AccountsService,
    private readonly transactionsService: TransactionsService,
    private readonly transactionRequestsService: TransactionRequestsService,
    private readonly reversalService: ReversalService,
    private readonly ledgerService: LedgerService,
    private readonly userHistoryService: UserHistoryService,
  ) { }

  async getDashboardStats() {
    const totalUsers = await this.usersService.countAll();
    const totalAccounts = await this.accountsService.countAll();

    // 1. Get CASH_VAULT balance by summing ledger entries
    const cashVaultAccount = await this.dataSource.getRepository(Account).findOne({
      where: { accountNumber: SystemAccount.CASH_VAULT as string }
    });
    let cashVaultBalance = new Decimal(0);
    if (cashVaultAccount) {
      cashVaultBalance = await this.ledgerService.calculateAssetBalanceFromLedger(
        this.dataSource.manager,
        cashVaultAccount.id
      );
    }

    // 2. Get total customer deposits (only active accounts belonging to CUSTOMER role)
    const customerAccounts = await this.dataSource.getRepository(Account)
      .createQueryBuilder('acc')
      .leftJoin('acc.user', 'user')
      .where('user.role = :role', { role: UserRole.CUSTOMER })
      .andWhere('acc.status = :status', { status: AccountStatus.ACTIVE })
      .getMany();
    const totalCustomerDeposits = customerAccounts.reduce(
      (sum, acc) => sum.plus(new Decimal(acc.balance)),
      new Decimal(0)
    );

    // 3. Get bank revenue (SYS_REVENUE balance)
    const revenueAccount = await this.dataSource.getRepository(Account).findOne({
      where: { accountNumber: SystemAccount.REVENUE as string }
    });
    const bankRevenue = revenueAccount ? new Decimal(revenueAccount.balance) : new Decimal(0);

    const weeklyVolume = await this.transactionsService.getWeeklyVolume();

    return {
      totalUsers,
      totalAccounts,
      totalBalance: totalCustomerDeposits.toFixed(2), // Keep for backward compatibility
      cashVaultBalance: cashVaultBalance.toFixed(2),
      totalCustomerDeposits: totalCustomerDeposits.toFixed(2),
      bankRevenue: bankRevenue.toFixed(2),
      weeklyVolume,
    };
  }

  async getTellerDashboardStats(tellerId: string) {
    const requestStats = await this.transactionRequestsService.getTellerRequestStatsToday(tellerId);
    const txStats = await this.transactionsService.getTellerTransactionStatsToday(tellerId);
    return {
      ...requestStats,
      ...txStats,
    };
  }

  async getManagerDashboardStats() {
    const pendingRequestsCount = await this.transactionRequestsService.getPendingRequestsCount();
    const branchCashFlow = await this.transactionsService.getBranchCashFlowToday();
    const tellerPerformance = await this.transactionRequestsService.getTellerPerformanceToday();
    return {
      pendingRequestsCount,
      ...branchCashFlow,
      tellerPerformance,
    };
  }

  async reactivateOtp(userId: string, currentAdmin: User): Promise<User> {
    const targetUser = await this.usersService.findById(userId);
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    if (currentAdmin.role === UserRole.MANAGER && targetUser.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Quản lý chỉ có thể kích hoạt OTP cho khách hàng');
    }
    return await this.usersService.reactivateOtp(userId, currentAdmin.id);
  }

  async updateDailyLimit(accountId: string, dailyLimit: string | null, currentAdmin: User) {
    const account = await this.accountsService.findByIdAdmin(accountId);
    if (!account) {
      throw new NotFoundException(`Account with ID "${accountId}" not found`);
    }
    if (currentAdmin.role === UserRole.MANAGER && account.user?.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Quản lý chỉ có thể chỉnh sửa hạn mức tài khoản của khách hàng');
    }
    const oldDailyLimit = account.dailyLimit;
    const updatedAccount = await this.accountsService.updateDailyLimit(accountId, dailyLimit);
    return {
      id: updatedAccount.id,
      accountNumber: updatedAccount.accountNumber,
      dailyLimit: updatedAccount.dailyLimit,
      oldDailyLimit,
    };
  }

  async getUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: UserStatus,
    includeDeleted: boolean = false,
    roleGroup?: 'customer' | 'staff',
  ) {
    const { data, total } = await this.usersService.findAll(
      page,
      limit,
      search,
      status,
      includeDeleted,
      roleGroup,
    );

    const formattedData = data.map((user) => {
      const balance = (user.accounts || []).reduce((acc, cur) => acc.plus(new Decimal(cur.balance)), new Decimal(0));
      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        balance: balance.toFixed(2),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt ?? null,
      };
    });

    return {
      data: formattedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createUser(dto: CreateUserAdminDto): Promise<User> {
    return this.usersService.create(dto);
  }

  async getUserById(id: string) {
    const user = await this.usersService.findById(id, { accounts: true });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const account = user.accounts?.[0];
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      accountNumber: account ? account.accountNumber : null,
      balance: account ? account.balance : '0.00',
      createdAt: user.createdAt,
    };
  }

  async getUserHistory(userId: string) {
    return await this.userHistoryService.findByUserId(userId);
  }

  async softDeleteUser(userId: string) {
    return await this.usersService.softDelete(userId);
  }

  async getAccountLedger(accountId: string) {
    // In a real app we might want pagination, but for now we fetch all or top 100 for admin view
    return await this.ledgerService.getEntriesByAccount(accountId);
  }

  async updateUserStatus(id: string, status: UserStatus, currentAdmin: User) {
    if (id === currentAdmin.id) {
      throw new BadRequestException('Administrators cannot lock their own accounts');
    }
    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    if (currentAdmin.role === UserRole.MANAGER && targetUser.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Quản lý chỉ có thể khóa/mở khóa tài khoản của khách hàng');
    }
    const oldStatus = targetUser.status;
    const updatedUser = await this.usersService.updateStatus(id, status, currentAdmin.id);
    return {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      oldStatus,
      createdAt: updatedUser.createdAt,
    };
  }

  async getAccounts(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: AccountStatus,
    type?: 'customer' | 'system' | 'all',
  ) {
    const { data, total } = await this.accountsService.findAll(page, limit, search, status, type);
    
    const accountsData = [];
    for (const acc of data) {
      let balance = acc.balance;
      const isSystem = acc.accountNumber.startsWith('SYS_');
      if (isSystem) {
        if (acc.accountNumber === (SystemAccount.CASH_VAULT as string)) {
          const bal = await this.ledgerService.calculateAssetBalanceFromLedger(this.dataSource.manager, acc.id);
          balance = bal.toFixed(2);
        } else {
          const bal = await this.ledgerService.calculateLiabilityBalanceFromLedger(this.dataSource.manager, acc.id);
          balance = bal.toFixed(2);
        }
      }
      accountsData.push({
        id: acc.id,
        accountNumber: acc.accountNumber,
        balance,
        holdBalance: acc.holdBalance,
        dailyLimit: (acc as { dailyLimit: string | null }).dailyLimit,
        currency: acc.currency,
        status: acc.status,
        ownerName: acc.user?.fullName,
        ownerEmail: acc.user?.email,
        createdAt: acc.createdAt,
      });
    }

    return {
      data: accountsData,
      meta: {
        page, limit, total, totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateAccountStatus(id: string, status: AccountStatus, currentAdmin: User) {
    // Fetch old status BEFORE update so audit log can record accurate before/after
    const before = await this.accountsService.findByIdAdmin(id);
    if (!before) {
      throw new NotFoundException(`Account with ID "${id}" not found`);
    }
    if (currentAdmin.role === UserRole.MANAGER && before.user?.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Quản lý chỉ có thể đóng/mở tài khoản của khách hàng');
    }
    const account = await this.accountsService.updateStatus(id, status);
    return {
      id: account.id,
      accountNumber: account.accountNumber,
      status: account.status,
      oldStatus: before?.status ?? null,  // consumed by audit interceptor, not exposed to UI
    };
  }

  async depositToAccount(id: string, amount: string, currentUserId: string, description?: string) {
    const idempotencyKey = crypto.randomUUID();
    const tx = await this.transactionRequestsService.adminDeposit(
      id,
      amount,
      description || 'Admin Deposit',
      idempotencyKey,
      currentUserId
    );
    return tx;
  }

  async withdrawFromAccount(id: string, amount: string, currentUserId: string, description?: string) {
    const idempotencyKey = crypto.randomUUID();
    const tx = await this.transactionRequestsService.adminWithdraw(
      id,
      amount,
      description || 'Admin Withdraw',
      idempotencyKey,
      currentUserId
    );
    return tx;
  }

  async transferFromAccount(
    id: string,
    toAccountNumber: string,
    amount: string,
    currentUserId: string,
    description?: string,
  ) {
    const idempotencyKey = crypto.randomUUID();
    const tx = await this.transactionRequestsService.adminTransfer(
      id,
      toAccountNumber,
      amount,
      description || 'Admin Transfer',
      idempotencyKey,
      currentUserId,
    );
    return tx;
  }

  async approveRequest(requestId: string, currentUserId: string) {
    return await this.transactionRequestsService.approveRequest(requestId, currentUserId);
  }

  async rejectRequest(requestId: string, currentUserId: string, rejectionReason: string) {
    return await this.transactionRequestsService.rejectRequest(requestId, currentUserId, rejectionReason);
  }

  async requestReversal(transactionId: string, requesterId: string, reason: string) {
    return await this.reversalService.requestReversal(transactionId, requesterId, reason);
  }

  async getTransactionRequests(page: number = 1, limit: number = 10, status?: string, tellerId?: string) {
    return await this.transactionRequestsService.findAllRequests(page, limit, status, tellerId);
  }

  async getTransactions(page: number = 1, limit: number = 10, search?: string, startDate?: string, endDate?: string, type?: string, tellerId?: string) {
    const { data, total, stats } = await this.transactionsService.findAll(page, limit, search, startDate, endDate, type, tellerId);
    return {
      data: data.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        fee: tx.fee,
        totalAmount: tx.totalAmount,
        status: tx.status,
        description: tx.description,
        fromAccount: tx.fromAccount?.accountNumber || null,
        fromUserName: tx.fromAccount?.user?.fullName || null,
        toAccount: tx.toAccount?.accountNumber || null,
        toUserName: tx.toAccount?.user?.fullName || null,
        createdAt: tx.createdAt,
        originalTransactionId: tx.originalTransactionId,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        totalVolume: stats.totalVolume,
        successfulCount: stats.successfulCount,
        failedCount: stats.failedCount,
      }
    };
  }
}
