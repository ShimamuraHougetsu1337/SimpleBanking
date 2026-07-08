import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { UserStatus } from '@/users/entities/user.entity';
import { AccountsService } from '@/accounts/accounts.service';
import { TransactionsService } from '@/transactions/services/transactions.service';
import { TransactionRequestsService } from '@/transactions/services/transaction-requests.service';
import { LedgerService } from '@/transactions/services/ledger.service';
import { AccountStatus } from '@/accounts/entities/account.entity';
import { UserHistoryService } from '@/users/services/user-history.service';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { User } from '@/users/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly accountsService: AccountsService,
    private readonly transactionsService: TransactionsService,
    private readonly transactionRequestsService: TransactionRequestsService,
    private readonly ledgerService: LedgerService,
    private readonly userHistoryService: UserHistoryService,
  ) { }

  async getDashboardStats() {
    const totalUsers = await this.usersService.countAll();
    const totalAccounts = await this.accountsService.countAll();

    // Total balance sum
    // Let's do it simply by fetching all active accounts if possible, or a raw query.
    // For simplicity, we can fetch all accounts and sum it up, but in real life it should be a DB SUM.
    // Since we don't have a sum function in accountsService, we can add it there or just do a raw query here.
    // Let's just fetch all accounts and sum here for now, or assume another way.
    // Wait, let's just ask accountsService for total balance.
    // Actually, I can use a raw query here or add it to AccountsService.
    const allAccounts = await this.accountsService.findAll(1, 100000);
    const totalBalance = allAccounts.data.reduce((sum, acc) => sum.plus(new Decimal(acc.balance)), new Decimal(0));

    const weeklyVolume = await this.transactionsService.getWeeklyVolume();

    return {
      totalUsers,
      totalAccounts,
      totalBalance: totalBalance.toFixed(2),
      weeklyVolume,
    };
  }

  async getUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: UserStatus,
    includeDeleted: boolean = false,
  ) {
    const { data, total } = await this.usersService.findAll(page, limit, search, status, includeDeleted);

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

  async updateUserStatus(id: string, status: UserStatus, currentAdminId: string) {
    if (id === currentAdminId) {
      throw new BadRequestException('Administrators cannot lock their own accounts');
    }
    const updatedUser = await this.usersService.updateStatus(id, status);
    return {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
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
    return {
      data: data.map(acc => ({
        id: acc.id,
        accountNumber: acc.accountNumber,
        balance: acc.balance,
        currency: acc.currency,
        status: acc.status,
        ownerName: acc.user?.fullName,
        ownerEmail: acc.user?.email,
        createdAt: acc.createdAt,
      })),
      meta: {
        page, limit, total, totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateAccountStatus(id: string, status: AccountStatus) {
    // Fetch old status BEFORE update so audit log can record accurate before/after
    const before = await this.accountsService.findByIdAdmin(id);
    const account = await this.accountsService.updateStatus(id, status);
    return {
      id: account.id,
      accountNumber: account.accountNumber,
      status: account.status,
      oldStatus: before?.status ?? null,  // consumed by audit interceptor, not exposed to UI
    };
  }

  async depositToAccount(id: string, amount: string, currentUserId: string, description?: string) {
    const idempotencyKey = uuidv4();
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
    const idempotencyKey = uuidv4();
    const tx = await this.transactionRequestsService.adminWithdraw(
      id,
      amount,
      description || 'Admin Withdraw',
      idempotencyKey,
      currentUserId
    );
    return tx;
  }

  async approveRequest(requestId: string, currentUserId: string) {
    return await this.transactionRequestsService.approveRequest(requestId, currentUserId);
  }

  async rejectRequest(requestId: string, currentUserId: string) {
    return await this.transactionRequestsService.rejectRequest(requestId, currentUserId);
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
