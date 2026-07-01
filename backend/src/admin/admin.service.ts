import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { UserStatus } from '@/users/entities/user.entity';
import { AccountsService } from '@/accounts/accounts.service';
import { TransactionsService } from '@/transactions/transactions.service';
import { AccountStatus } from '@/accounts/entities/account.entity';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly accountsService: AccountsService,
    private readonly transactionsService: TransactionsService,
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
  ) {
    const { data, total } = await this.usersService.findAll(page, limit, search, status);

    const formattedData = data.map((user) => {
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

  async getAccounts(page: number = 1, limit: number = 10, search?: string, status?: AccountStatus) {
    const { data, total } = await this.accountsService.findAll(page, limit, search, status);
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
    const account = await this.accountsService.updateStatus(id, status);
    return {
      id: account.id,
      accountNumber: account.accountNumber,
      status: account.status,
    };
  }

  async depositToAccount(id: string, amount: string, description?: string) {
    const idempotencyKey = uuidv4();
    const tx = await this.transactionsService.adminDeposit(
      id,
      amount,
      description || 'Admin Deposit',
      idempotencyKey
    );
    return tx;
  }

  async getTransactions(page: number = 1, limit: number = 10, search?: string, startDate?: string, endDate?: string, type?: string) {
    const { data, total, stats } = await this.transactionsService.findAll(page, limit, search, startDate, endDate, type);
    return {
      data: data.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        description: tx.description,
        fromAccount: tx.fromAccount?.accountNumber || null,
        fromUserName: tx.fromAccount?.user?.fullName || null,
        toAccount: tx.toAccount?.accountNumber || null,
        toUserName: tx.toAccount?.user?.fullName || null,
        createdAt: tx.createdAt,
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
