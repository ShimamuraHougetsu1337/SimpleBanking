import { Injectable, BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Brackets, Repository, DataSource } from 'typeorm';
import { TransactionsHelper } from '../helpers/transactions.helper';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { LedgerEntryType } from '../entities/ledger-entry.entity';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';
import { TransferDto } from '../dto/transfer.dto';
import { DepositDto } from '../dto/deposit.dto';
import { WithdrawDto } from '../dto/withdraw.dto';
import { SystemSetting } from '@/admin/entities/system-setting.entity';
import Decimal from 'decimal.js';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly transactionsHelper: TransactionsHelper,
    @InjectQueue('fee_queue') private readonly feeQueue: Queue,
  ) { }

  // ===========================================================================
  // QUERY METHODS (READ)
  // ===========================================================================

  async getTransactionsForUser(
    userId: string,
    page: number = 1,
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
      this.transactionsHelper.applySearchFilter(query, `%${filter.search}%`);
    }

    if (filter?.fromDate) {
      query.andWhere('tx.createdAt >= :fromDate', { fromDate: filter.fromDate });
    }

    if (filter?.toDate) {
      const toDate = new Date(filter.toDate);
      toDate.setUTCHours(23, 59, 59, 999);
      query.andWhere('tx.createdAt <= :toDate', { toDate });
    }

    const [transactions, total] = await query
      .orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = transactions.flatMap((tx) => {
      if (accountId) {
        if (tx.fromAccountId === accountId) return this.transactionsHelper.mapToResult(tx, 'debit', tx.toAccount);
        if (tx.toAccountId === accountId) return this.transactionsHelper.mapToResult(tx, 'credit', tx.fromAccount);
        return [];
      }

      const isFromUser = tx.fromAccount?.userId === userId;
      const isToUser = tx.toAccount?.userId === userId;

      if (isFromUser && isToUser) {
        return [
          this.transactionsHelper.mapToResult(tx, 'debit', tx.toAccount, 'debit'),
          this.transactionsHelper.mapToResult(tx, 'credit', tx.fromAccount, 'credit'),
        ];
      }
      if (isFromUser) return this.transactionsHelper.mapToResult(tx, 'debit', tx.toAccount);
      if (isToUser) return this.transactionsHelper.mapToResult(tx, 'credit', tx.fromAccount);
      return [];
    });

    return { data, total };
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, startDate?: string, endDate?: string, type?: string, tellerId?: string) {
    const query = this.transactionRepository.createQueryBuilder('tx')
      .leftJoinAndSelect('tx.fromAccount', 'fromAccount')
      .leftJoinAndSelect('tx.toAccount', 'toAccount')
      .leftJoinAndSelect('fromAccount.user', 'fromUser')
      .leftJoinAndSelect('toAccount.user', 'toUser');

    if (search) this.transactionsHelper.applySearchFilter(query, `%${search}%`);
    if (startDate) query.andWhere('tx.createdAt >= :startDate', { startDate });
    if (endDate) query.andWhere('tx.createdAt <= :endDate', { endDate });
    if (type) query.andWhere('tx.type = :type', { type });
    if (tellerId) {
      query.andWhere('tx.requestId IN (SELECT id FROM transaction_requests WHERE created_by_id = :tellerId)', { tellerId });
    }

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
  // TRANSACTION METHODS (WRITE)
  // ===========================================================================

  async transfer(dto: TransferDto, currentUserId: string): Promise<Transaction> {
    const existing = await this.transactionsHelper.checkIdempotency(dto.idempotencyKey);
    if (existing) return existing;

    const transactionResult = await this.transactionsHelper.executeTransaction(async (manager) => {
      // Find fee
      const feeSetting = await manager.findOne(SystemSetting, { where: { settingKey: 'transfer_fee' } });
      const feeValue = new Decimal(feeSetting?.settingValue || 0);

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

      accountIdsToLock.sort();

      const lockedAccounts = new Map<string, Account>();
      for (const id of accountIdsToLock) {
        const acc = await manager.findOne(Account, { where: { id }, lock: { mode: 'pessimistic_write' } });
        if (acc) lockedAccounts.set(id, acc);
      }

      const fromAccount = lockedAccounts.get(fromAccountId);
      const toAccount = lockedAccounts.get(toAccountId);

      if (!fromAccount || fromAccount.userId !== currentUserId || fromAccount.status !== AccountStatus.ACTIVE) throw new NotFoundException('Source account not found or is locked');
      if (!toAccount) throw new NotFoundException('Destination account not found');
      if (toAccount.status !== AccountStatus.ACTIVE) throw new UnprocessableEntityException('Destination account is locked');

      const amount = this.transactionsHelper.validateAmount(dto.amount);
      const totalAmount = amount.plus(feeValue);

      if (totalAmount.gt(fromAccount.balance)) {
        throw new UnprocessableEntityException('Số dư tài khoản không đủ ');
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

      const debitBalanceAfter = await this.transactionsHelper.updateAccountBalance(manager, fromAccount.id, totalAmount, 'subtract');
      const creditBalanceAfter = await this.transactionsHelper.updateAccountBalance(manager, toAccount.id, amount, 'add');

      const transactionResult = await this.transactionsHelper.createAndSaveTransaction(manager, {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: dto.amount,
        fee: feeValue.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        description: dto.description,
        idempotencyKey: dto.idempotencyKey,
        type: TransactionType.TRANSFER,
      });

      // Record double-entry ledger: DEBIT sender (totalAmount incl. fee), CREDIT receiver (amount only)
      await this.transactionsHelper.createLedgerEntriesForTransfer(
        manager,
        transactionResult.id,
        fromAccount.id,
        toAccount.id,
        totalAmount,
        debitBalanceAfter,
        creditBalanceAfter,
      );

      return transactionResult;
    });

    if (new Decimal(transactionResult.fee).gt(0)) {
      await this.feeQueue.add('insert_fee', {
        transactionId: transactionResult.id,
        amount: transactionResult.fee,
        type: 'credit',
      });
    }

    return transactionResult;
  }



  async deposit(dto: DepositDto, currentUserId: string): Promise<Transaction> {
    const existing = await this.transactionsHelper.checkIdempotency(dto.idempotencyKey);
    if (existing) return existing;

    return this.transactionsHelper.executeTransaction(async (manager) => {
      const account = await this.transactionsHelper.getAccountWithLock(manager, dto.accountId, currentUserId);
      const amount = this.transactionsHelper.validateAmount(dto.amount);

      const balanceAfter = await this.transactionsHelper.updateAccountBalance(manager, account.id, amount, 'add');

      const tx = await this.transactionsHelper.createAndSaveTransaction(manager, {
        toAccountId: account.id,
        amount: dto.amount.toString(),
        fee: '0.00',
        totalAmount: dto.amount.toString(),
        description: dto.description || 'Deposit',
        idempotencyKey: dto.idempotencyKey,
        type: TransactionType.DEPOSIT,
      });

      await this.transactionsHelper.createSingleLedgerEntry(
        manager,
        tx.id,
        account.id,
        LedgerEntryType.CREDIT,
        amount,
        balanceAfter,
      );

      return tx;
    });
  }

  async withdraw(dto: WithdrawDto, currentUserId: string): Promise<Transaction> {
    const existing = await this.transactionsHelper.checkIdempotency(dto.idempotencyKey);
    if (existing) return existing;

    return this.transactionsHelper.executeTransaction(async (manager) => {
      const account = await this.transactionsHelper.getAccountWithLock(manager, dto.accountId, currentUserId);
      const amount = this.transactionsHelper.validateAmount(dto.amount, account.balance);

      const balanceAfter = await this.transactionsHelper.updateAccountBalance(manager, account.id, amount, 'subtract');

      const tx = await this.transactionsHelper.createAndSaveTransaction(manager, {
        fromAccountId: account.id,
        amount: dto.amount.toString(),
        fee: '0.00',
        totalAmount: dto.amount.toString(),
        description: dto.description || 'Withdraw',
        idempotencyKey: dto.idempotencyKey,
        type: TransactionType.WITHDRAW,
      });

      await this.transactionsHelper.createSingleLedgerEntry(
        manager,
        tx.id,
        account.id,
        LedgerEntryType.DEBIT,
        amount,
        balanceAfter,
      );

      return tx;
    });
  }

}
