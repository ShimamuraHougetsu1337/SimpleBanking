import { Injectable, BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Brackets, Repository, DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';
import { UserRole } from '@/users/entities/user.entity';
import { TransferDto } from './dto/transfer.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { SystemSetting } from '@/admin/entities/system-setting.entity';
import Decimal from 'decimal.js';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) { }

  // ===========================================================================
  // QUERY METHODS (READ)
  // ===========================================================================

  async getTransactionsForUser(
    userId: string,
    limit: number = 10,
    accountId?: string,
    filter?: Record<string, string>,
  ) {
    const query = this.transactionRepository
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.fromAccount', 'fromAccount')
      .leftJoinAndSelect('tx.toAccount', 'toAccount')
      .leftJoinAndSelect('fromAccount.user', 'fromUser')
      .leftJoinAndSelect('toAccount.user', 'toUser')
      .where(
        new Brackets((qb) => {
          qb.where('fromAccount.userId = :userId', { userId })
            .orWhere('toAccount.userId = :userId', { userId });
        })
      );

    if (accountId) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('tx.fromAccountId = :accountId', { accountId })
            .orWhere('tx.toAccountId = :accountId', { accountId });
        })
      );
    }

    if (filter?.search) {
      this.applySearchFilter(query, `%${filter.search}%`);
    }

    if (filter?.fromDate) {
      query.andWhere('tx.createdAt >= :fromDate', { fromDate: filter.fromDate });
    }

    if (filter?.toDate) {
      const toDate = new Date(filter.toDate);
      toDate.setUTCHours(23, 59, 59, 999);
      query.andWhere('tx.createdAt <= :toDate', { toDate });
    }

    const transactions = await query
      .orderBy('tx.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return transactions.flatMap((tx) => {
      if (accountId) {
        if (tx.fromAccountId === accountId) return this.mapToResult(tx, 'debit', tx.toAccount);
        if (tx.toAccountId === accountId) return this.mapToResult(tx, 'credit', tx.fromAccount);
        return [];
      }

      const isFromUser = tx.fromAccount?.userId === userId;
      const isToUser = tx.toAccount?.userId === userId;

      if (isFromUser && isToUser) {
        return [
          this.mapToResult(tx, 'debit', tx.toAccount, 'debit'),
          this.mapToResult(tx, 'credit', tx.fromAccount, 'credit'),
        ];
      }
      if (isFromUser) return this.mapToResult(tx, 'debit', tx.toAccount);
      if (isToUser) return this.mapToResult(tx, 'credit', tx.fromAccount);
      return [];
    });
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, startDate?: string, endDate?: string, type?: string) {
    const query = this.transactionRepository.createQueryBuilder('tx')
      .leftJoinAndSelect('tx.fromAccount', 'fromAccount')
      .leftJoinAndSelect('tx.toAccount', 'toAccount')
      .leftJoinAndSelect('fromAccount.user', 'fromUser')
      .leftJoinAndSelect('toAccount.user', 'toUser');

    if (search) this.applySearchFilter(query, `%${search}%`);
    if (startDate) query.andWhere('tx.createdAt >= :startDate', { startDate });
    if (endDate) query.andWhere('tx.createdAt <= :endDate', { endDate });
    if (type) query.andWhere('tx.type = :type', { type });

    const statsQuery = query.clone();
    const rawStats: { totalVolume: string | null; successfulCount: string | null; failedCount: string | null } | undefined = await statsQuery
      .select('SUM(CAST(tx.amount AS NUMERIC))', 'totalVolume')
      .addSelect(`SUM(CASE WHEN tx.status = 'success' THEN 1 ELSE 0 END)`, 'successfulCount')
      .addSelect(`SUM(CASE WHEN tx.status = 'failed' THEN 1 ELSE 0 END)`, 'failedCount')
      .getRawOne();

    const stats = {
      totalVolume: rawStats?.totalVolume || '0',
      successfulCount: Number(rawStats?.successfulCount) || 0,
      failedCount: Number(rawStats?.failedCount) || 0,
    };

    const [data, total] = await query
      .orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, stats };
  }

  async getWeeklyVolume() {
    const today = new Date();
    const last7Days = new Date();
    last7Days.setDate(today.getDate() - 7);

    const transactions = await this.transactionRepository.createQueryBuilder('tx')
      .where('tx.createdAt >= :date', { date: last7Days })
      .getMany();

    const volumeByDate = new Map<string, Decimal>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      volumeByDate.set(dateStr, new Decimal(0));
    }

    for (const tx of transactions) {
      const dateStr = tx.createdAt.toISOString().split('T')[0];
      if (volumeByDate.has(dateStr)) {
        volumeByDate.set(dateStr, volumeByDate.get(dateStr)!.plus(new Decimal(tx.amount)));
      }
    }

    return Array.from(volumeByDate.entries()).map(([date, volume]) => ({
      date,
      volume: volume.toFixed(2),
    }));
  }

  // ===========================================================================
  // FEE METHOD
  // ===========================================================================

  async getTransferFee(): Promise<{ fee: string }> {
    const feeSetting = await this.dataSource.getRepository(SystemSetting).findOne({ where: { settingKey: 'transfer_fee' } });
    return { fee: feeSetting?.settingValue || '0.00' };
  }

  // ===========================================================================
  // TRANSACTION METHODS (WRITE)
  // ===========================================================================

  async transfer(dto: TransferDto, currentUserId: string): Promise<Transaction> {
    const existing = await this.checkIdempotency(dto.idempotencyKey);
    if (existing) return existing;

    return this.executeTransaction(async (manager) => {
      // Find fee
      const feeSetting = await manager.findOne(SystemSetting, { where: { settingKey: 'transfer_fee' } });
      const feeValue = new Decimal(feeSetting?.settingValue || 0);

      let adminAccountRef: Account | null = null;
      if (feeValue.gt(0)) {
         adminAccountRef = await manager.createQueryBuilder(Account, 'account')
           .innerJoin('account.user', 'user')
           .where('user.role = :role', { role: UserRole.ADMIN })
           .getOne();
         if (!adminAccountRef) throw new NotFoundException('Admin account not found for fee collection');
      }

      // Resolve destination account first without locking to get its ID
      const toAccountRef = await manager.findOne(Account, {
        where: { accountNumber: dto.to_accountNumber },
      });

      if (!toAccountRef) {
        throw new NotFoundException('Destination account does not exist');
      }

      const fromAccountId = dto.from_accountId;
      const toAccountId = toAccountRef.id;

      if (fromAccountId === toAccountId) {
        throw new BadRequestException('Cannot transfer to the same account');
      }

      // Ensure consistent locking order and avoid deadlocks
      const accountIdsToLock = [fromAccountId, toAccountId];
      if (adminAccountRef && adminAccountRef.id !== fromAccountId && adminAccountRef.id !== toAccountId) {
          accountIdsToLock.push(adminAccountRef.id);
      }
      
      accountIdsToLock.sort();

      const lockedAccounts = new Map<string, Account>();
      for (const id of accountIdsToLock) {
         const acc = await manager.findOne(Account, { where: { id }, lock: { mode: 'pessimistic_write' } });
         if (acc) lockedAccounts.set(id, acc);
      }

      const fromAccount = lockedAccounts.get(fromAccountId);
      const toAccount = lockedAccounts.get(toAccountId);
      const adminAccount = adminAccountRef ? lockedAccounts.get(adminAccountRef.id) : null;

      if (!fromAccount || fromAccount.userId !== currentUserId || fromAccount.status !== AccountStatus.ACTIVE) throw new NotFoundException('Source account not found or is locked');
      if (!toAccount) throw new NotFoundException('Destination account not found');
      if (toAccount.status !== AccountStatus.ACTIVE) throw new UnprocessableEntityException('Destination account is locked');

      const amount = this.validateAmount(dto.amount);
      const totalAmount = amount.plus(feeValue);
      
      if (totalAmount.gt(fromAccount.balance)) {
         throw new UnprocessableEntityException('Insufficient balance');
      }

      // Check Daily Limit (chỉ tính số tiền chuyển, không tính phí)
      const limitSetting = await manager.findOne(SystemSetting, { where: { settingKey: 'daily_limit' } });
      if (limitSetting) {
        const dailyLimit = new Decimal(limitSetting.settingValue);
        const usedLimit = new Decimal(fromAccount.usedDailyLimit || 0);
        if (usedLimit.plus(amount).gt(dailyLimit)) {
          throw new BadRequestException('Bạn đã vượt quá hạn mức chuyển tiền hàng ngày');
        }
        // Update used daily limit
        await manager
          .createQueryBuilder()
          .update(Account)
          .set({ usedDailyLimit: () => `"used_daily_limit" + ${amount.toFixed(2)}` })
          .where('id = :id', { id: fromAccount.id })
          .execute();
      }

      await this.updateAccountBalance(manager, fromAccount.id, totalAmount, 'subtract');
      await this.updateAccountBalance(manager, toAccount.id, amount, 'add');
      
      if (adminAccount && feeValue.gt(0)) {
         await this.updateAccountBalance(manager, adminAccount.id, feeValue, 'add');
      }

      return this.createAndSaveTransaction(manager, {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: dto.amount,
        fee: feeValue.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        description: dto.description,
        idempotencyKey: dto.idempotencyKey,
        type: TransactionType.TRANSFER,
      });
    });
  }

  async adminDeposit(accountId: string, amountStr: string, description: string, idempotencyKey: string): Promise<Transaction> {
    const existing = await this.checkIdempotency(idempotencyKey);
    if (existing) return existing;

    return this.executeTransaction(async (manager) => {
      const account = await this.getAccountWithLock(manager, accountId);
      const amount = this.validateAmount(amountStr);

      await this.updateAccountBalance(manager, account.id, amount, 'add');

      return this.createAndSaveTransaction(manager, {
        toAccountId: accountId,
        amount: amountStr,
        fee: '0.00',
        totalAmount: amountStr,
        description,
        idempotencyKey,
        type: TransactionType.DEPOSIT,
      });
    });
  }

  async deposit(dto: DepositDto, currentUserId: string): Promise<Transaction> {
    const existing = await this.checkIdempotency(dto.idempotencyKey);
    if (existing) return existing;

    return this.executeTransaction(async (manager) => {
      const account = await this.getAccountWithLock(manager, dto.accountId, currentUserId);
      const amount = this.validateAmount(dto.amount);

      await this.updateAccountBalance(manager, account.id, amount, 'add');

      return this.createAndSaveTransaction(manager, {
        toAccountId: account.id,
        amount: dto.amount.toString(),
        fee: '0.00',
        totalAmount: dto.amount.toString(),
        description: dto.description || 'Deposit',
        idempotencyKey: dto.idempotencyKey,
        type: TransactionType.DEPOSIT,
      });
    });
  }

  async withdraw(dto: WithdrawDto, currentUserId: string): Promise<Transaction> {
    const existing = await this.checkIdempotency(dto.idempotencyKey);
    if (existing) return existing;

    return this.executeTransaction(async (manager) => {
      const account = await this.getAccountWithLock(manager, dto.accountId, currentUserId);
      const amount = this.validateAmount(dto.amount, account.balance);

      await this.updateAccountBalance(manager, account.id, amount, 'subtract');

      return this.createAndSaveTransaction(manager, {
        fromAccountId: account.id,
        amount: dto.amount.toString(),
        fee: '0.00',
        totalAmount: dto.amount.toString(),
        description: dto.description || 'Withdraw',
        idempotencyKey: dto.idempotencyKey,
        type: TransactionType.WITHDRAW,
      });
    });
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async executeTransaction<T>(operation: (manager: EntityManager) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async checkIdempotency(key: string): Promise<Transaction | null> {
    return this.dataSource.getRepository(Transaction).findOne({ where: { idempotencyKey: key } });
  }

  private async getAccountWithLock(manager: EntityManager, accountId: string, userId?: string): Promise<Account> {
    const where: import('typeorm').FindOptionsWhere<Account> = { id: accountId, status: AccountStatus.ACTIVE };
    if (userId) where.userId = userId;

    const account = await manager.findOne(Account, { where, lock: { mode: 'pessimistic_write' } });
    if (!account) {
      throw new NotFoundException('Account not found or is locked');
    }
    return account;
  }

  private validateAmount(amountStr: string | number, balanceStr?: string | number): Decimal {
    const amount = new Decimal(amountStr);
    if (amount.lte(0)) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    if (amount.decimalPlaces() > 2) {
      throw new BadRequestException('Amount has a maximum of 2 decimal places');
    }
    if (balanceStr !== undefined) {
      const balance = new Decimal(balanceStr);
      if (amount.gt(balance)) {
        throw new UnprocessableEntityException('Insufficient balance');
      }
    }
    return amount;
  }

  private async updateAccountBalance(manager: EntityManager, accountId: string, amount: Decimal, operation: 'add' | 'subtract') {
    const sign = operation === 'add' ? '+' : '-';
    await manager
      .createQueryBuilder()
      .update(Account)
      .set({ balance: () => `balance ${sign} ${amount.toFixed(2)}` })
      .where('id = :id', { id: accountId })
      .execute();
  }

  private async createAndSaveTransaction(manager: EntityManager, data: Partial<Transaction>): Promise<Transaction> {
    const transaction = manager.create(Transaction, {
      ...data,
      status: TransactionStatus.SUCCESS,
    });
    return manager.save(Transaction, transaction);
  }

  private applySearchFilter(query: SelectQueryBuilder<Transaction>, searchPattern: string) {
    query.andWhere(
      new Brackets((qb) => {
        qb.where('tx.description ILIKE :search', { search: searchPattern })
          .orWhere('CAST(tx.id AS TEXT) ILIKE :search', { search: searchPattern })
          .orWhere('fromUser.fullName ILIKE :search', { search: searchPattern })
          .orWhere('toUser.fullName ILIKE :search', { search: searchPattern })
          .orWhere('fromAccount.accountNumber ILIKE :search', { search: searchPattern })
          .orWhere('toAccount.accountNumber ILIKE :search', { search: searchPattern });
      }),
    );
  }

  private mapToResult(
    tx: Transaction,
    direction: 'credit' | 'debit',
    counterpartAccount: Account | null | undefined,
    suffix?: string,
  ) {
    const defaultName = direction === 'credit' ? 'Hệ thống' : 'Hệ thống';
    const counterpartName = counterpartAccount?.user?.fullName || counterpartAccount?.name || defaultName;

    return {
      id: suffix ? `${tx.id}-${suffix}` : tx.id,
      type: tx.type,
      direction,
      amount: tx.amount,
      fee: tx.fee,
      totalAmount: tx.totalAmount,
      counterpartAccount: counterpartAccount?.accountNumber,
      counterpartName,
      description: tx.description,
      status: tx.status,
      createdAt: tx.createdAt,
    };
  }
}
