import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets, SelectQueryBuilder } from 'typeorm';
import { TransactionsHelper } from '../helpers/transactions.helper';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { LedgerEntryType } from '../entities/ledger-entry.entity';
import { Account } from '@/accounts/entities/account.entity';
import { TransferDto } from '../dto/transfer.dto';
import { DepositDto } from '../dto/deposit.dto';
import { WithdrawDto } from '../dto/withdraw.dto';
import { SystemSettingsService } from '@/system-settings/system-settings.service';
import { OtpService } from './otp.service';
import Decimal from 'decimal.js';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly transactionsHelper: TransactionsHelper,
    private readonly otpService: OtpService,
    private readonly systemSettingsService: SystemSettingsService,
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
        new Brackets((qb: SelectQueryBuilder<Transaction>) => {
          qb.where('fromAccount.userId = :userId', { userId })
            .orWhere('toAccount.userId = :userId', { userId });
        })
      );

    if (accountId) {
      query.andWhere(
        new Brackets((qb: SelectQueryBuilder<Transaction>) => {
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
      .addSelect(`SUM(CASE WHEN tx.status = 'completed' THEN 1 ELSE 0 END)`, 'successfulCount')
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

  async transfer(dto: TransferDto, currentUserId: string, idempotencyKey: string): Promise<Transaction> {
    const existing = await this.transactionsHelper.checkIdempotency(idempotencyKey);
    if (existing) return existing;

    const otpThresholdVal = this.systemSettingsService.getSetting<number>('otp_transaction_threshold');
    const otpThreshold = new Decimal(otpThresholdVal ?? 10000000);
    const amount = new Decimal(dto.amount);

    if (amount.gte(otpThreshold)) {
      return this.createPendingOtpTransaction(dto, currentUserId, idempotencyKey, TransactionType.TRANSFER);
    }

    return this.transactionsHelper.executeTransaction(async (manager) => {
      const toAccountRef = await manager.findOne(Account, {
        where: { accountNumber: dto.to_accountNumber },
      });
      if (!toAccountRef) {
        throw new NotFoundException('Destination account does not exist');
      }

      const feeVal = this.systemSettingsService.getSetting<number>('transfer_fee');
      const feeValue = new Decimal(feeVal ?? 0);
      const totalAmount = amount.plus(feeValue);

      const tx = manager.create(Transaction, {
        fromAccountId: dto.from_accountId,
        toAccountId: toAccountRef.id,
        amount: dto.amount,
        fee: feeValue.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        type: TransactionType.TRANSFER,
        status: TransactionStatus.PROCESSING,
        description: dto.description,
        idempotencyKey,
      });
      const savedTx = await manager.save(Transaction, tx);

      return this.transactionsHelper.executeMovement(manager, savedTx);
    });
  }

  async deposit(dto: DepositDto, currentUserId: string, idempotencyKey: string): Promise<Transaction> {
    const existing = await this.transactionsHelper.checkIdempotency(idempotencyKey);
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
        idempotencyKey,
        type: TransactionType.DEPOSIT,
      });

      await this.transactionsHelper.createLedgerEntries(manager, [
        {
          accountId: account.id,
          transactionId: tx.id,
          type: LedgerEntryType.CREDIT,
          amount,
          balanceAfter,
        },
      ]);

      return tx;
    });
  }

  async withdraw(dto: WithdrawDto, currentUserId: string, idempotencyKey: string): Promise<Transaction> {
    const existing = await this.transactionsHelper.checkIdempotency(idempotencyKey);
    if (existing) return existing;

    const otpThresholdVal = this.systemSettingsService.getSetting<number>('otp_transaction_threshold');
    const otpThreshold = new Decimal(otpThresholdVal ?? 10000000);
    const amount = new Decimal(dto.amount);

    if (amount.gte(otpThreshold)) {
      return this.createPendingOtpTransaction(dto, currentUserId, idempotencyKey, TransactionType.WITHDRAW);
    }

    return this.transactionsHelper.executeTransaction(async (manager) => {
      const tx = manager.create(Transaction, {
        fromAccountId: dto.accountId,
        amount: dto.amount.toString(),
        fee: '0.00',
        totalAmount: dto.amount.toString(),
        type: TransactionType.WITHDRAW,
        status: TransactionStatus.PROCESSING,
        description: dto.description || 'Withdraw',
        idempotencyKey,
      });
      const savedTx = await manager.save(Transaction, tx);

      return this.transactionsHelper.executeMovement(manager, savedTx);
    });
  }

  /**
   * Helper to create transaction in PENDING_OTP status and generate OTP.
   */
  private async createPendingOtpTransaction(
    dto: TransferDto | WithdrawDto,
    currentUserId: string,
    idempotencyKey: string,
    type: TransactionType,
  ): Promise<Transaction> {
    let fromAccountId: string | null = null;
    let toAccountId: string | null = null;
    const amountStr = dto.amount.toString();
    let feeStr = '0.00';
    let totalAmountStr = amountStr;
    const description = dto.description || '';

    if (type === TransactionType.TRANSFER) {
      const transferDto = dto as TransferDto;
      fromAccountId = transferDto.from_accountId;

      const toAccountRef = await this.dataSource.getRepository(Account).findOne({
        where: { accountNumber: transferDto.to_accountNumber },
      });
      if (!toAccountRef) {
        throw new NotFoundException('Destination account does not exist');
      }
      toAccountId = toAccountRef.id;

      const feeVal = this.systemSettingsService.getSetting<number>('transfer_fee');
      const feeValue = new Decimal(feeVal ?? 0);
      const totalAmount = new Decimal(amountStr).plus(feeValue);
      feeStr = feeValue.toFixed(2);
      totalAmountStr = totalAmount.toFixed(2);
    } else {
      const withdrawDto = dto as WithdrawDto;
      fromAccountId = withdrawDto.accountId;
    }

    const pendingTx = this.transactionRepository.create({
      fromAccountId,
      toAccountId,
      amount: amountStr,
      fee: feeStr,
      totalAmount: totalAmountStr,
      type,
      status: TransactionStatus.PENDING_OTP,
      description,
      idempotencyKey,
    });
    const savedTx = await this.transactionRepository.save(pendingTx);

    // Delegate to OtpService
    await this.otpService.createOtp(savedTx.id);

    return savedTx;
  }

  /**
   * Verifies OTP and executes the movement on success.
   */
  async verifyOtp(transactionId: string, code: string, userId: string): Promise<Transaction> {
    await this.otpService.verifyOtp(transactionId, code, userId);

    const tx = await this.transactionRepository.findOne({ where: { id: transactionId } });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    tx.status = TransactionStatus.PROCESSING;
    const processingTx = await this.transactionRepository.save(tx);

    return this.transactionsHelper.executeTransaction(async (manager) => {
      return this.transactionsHelper.executeMovement(manager, processingTx);
    });
  }

  /**
   * Resends OTP code for pending transaction.
   */
  async resendOtp(transactionId: string, userId: string): Promise<{ message: string }> {
    return this.otpService.resendOtp(transactionId, userId);
  }
}
