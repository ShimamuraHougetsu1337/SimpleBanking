import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { TransactionsHelper } from '../helpers/transactions.helper';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { LedgerEntryType } from '../entities/ledger-entry.entity';
import { TransactionRequest, TransactionRequestType, TransactionRequestStatus } from '../entities/transaction-request.entity';
import { Account } from '@/accounts/entities/account.entity';
import { SystemSettingsService } from '@/system-settings/system-settings.service';
import Decimal from 'decimal.js';
import { User, UserRole } from '@/users/entities/user.entity';

@Injectable()
export class TransactionRequestsService {
  constructor(
    @InjectRepository(TransactionRequest)
    private readonly transactionRequestRepository: Repository<TransactionRequest>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly transactionsHelper: TransactionsHelper,
    private readonly systemSettingsService: SystemSettingsService,
  ) { }

  async findAllRequests(page: number = 1, limit: number = 10, status?: string, tellerId?: string) {
    const query = this.transactionRequestRepository.createQueryBuilder('req')
      .leftJoinAndSelect('req.account', 'account')
      .leftJoinAndSelect('account.user', 'user')
      .leftJoinAndSelect('req.createdBy', 'createdBy')
      .leftJoinAndSelect('req.approvedBy', 'approvedBy');

    if (status) {
      query.andWhere('req.status = :status', { status });
    }

    if (tellerId) {
      query.andWhere('req.createdById = :tellerId', { tellerId });
    }

    const [data, total] = await query
      .orderBy('req.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map(req => ({
        id: req.id,
        type: req.type,
        amount: req.amount,
        status: req.status,
        description: req.description,
        accountNumber: req.account?.accountNumber,
        userName: req.account?.user?.fullName,
        createdBy: req.createdBy?.fullName,
        approvedBy: req.approvedBy?.fullName,
        createdAt: req.createdAt,
        approvedAt: req.approvedAt,
        rejectionReason: req.rejectionReason,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getTellerRequestStatsToday(tellerId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const pendingCount = await this.transactionRequestRepository.count({
      where: {
        createdById: tellerId,
        status: TransactionRequestStatus.PENDING,
      },
    });

    const approvedCount = await this.transactionRequestRepository.createQueryBuilder('req')
      .where('req.createdById = :tellerId', { tellerId })
      .andWhere('req.status = :approvedStatus', { approvedStatus: TransactionRequestStatus.APPROVED })
      .andWhere('req.approvedAt >= :startOfDay', { startOfDay })
      .getCount();

    const rejectedCount = await this.transactionRequestRepository.createQueryBuilder('req')
      .where('req.createdById = :tellerId', { tellerId })
      .andWhere('req.status = :rejectedStatus', { rejectedStatus: TransactionRequestStatus.REJECTED })
      .andWhere('req.approvedAt >= :startOfDay', { startOfDay })
      .getCount();

    return {
      pendingCount,
      approvedCount,
      rejectedCount,
    };
  }

  async adminDeposit(
    accountId: string,
    amountStr: string,
    description: string,
    idempotencyKey: string,
    currentUserId: string,
  ): Promise<Transaction | TransactionRequest> {
    const existingTx = await this.transactionsHelper.checkIdempotency(idempotencyKey);
    if (existingTx) return existingTx;

    return this.transactionsHelper.executeTransaction(async (manager) => {
      const { account, amount } = await this.validateAdminDepositEligibility(manager, accountId, amountStr);

      const thresholdVal = this.systemSettingsService.getSetting<number>('high_value_transaction_threshold');
      const threshold = new Decimal(thresholdVal ?? 500000000);

      if (amount.gt(threshold)) {
        const request = manager.create(TransactionRequest, {
          accountId,
          amount: amountStr,
          type: TransactionRequestType.DEPOSIT,
          status: TransactionRequestStatus.PENDING,
          description,
          idempotencyKey,
          createdById: currentUserId,
        });
        return manager.save(TransactionRequest, request);
      }

      return this.createAutoApprovedDeposit(manager, account, amount, amountStr, description, idempotencyKey, currentUserId);
    });
  }

  async adminWithdraw(
    accountId: string,
    amountStr: string,
    description: string,
    idempotencyKey: string,
    currentUserId: string,
  ): Promise<Transaction | TransactionRequest> {
    const existingTx = await this.transactionsHelper.checkIdempotency(idempotencyKey);
    if (existingTx) return existingTx;

    return this.transactionsHelper.executeTransaction(async (manager) => {
      const { account, amount } = await this.validateAdminWithdrawEligibility(manager, accountId, amountStr);

      const thresholdVal = this.systemSettingsService.getSetting<number>('high_value_transaction_threshold');
      const threshold = new Decimal(thresholdVal ?? 500000000);

      if (amount.gt(threshold)) {
        return this.createPendingWithdrawRequest(manager, account, amount, amountStr, description, idempotencyKey, currentUserId);
      }

      return this.createAutoApprovedWithdraw(manager, account, amount, amountStr, description, idempotencyKey, currentUserId);
    });
  }

  async approveRequest(requestId: string, currentUserId: string): Promise<Transaction> {
    return this.transactionsHelper.executeTransaction(async (manager) => {
      const request = await this.validateApprovalRequest(manager, requestId, currentUserId);
      const account = await this.transactionsHelper.getAccountWithLock(manager, request.accountId);
      const amount = new Decimal(request.amount);

      let fromAccountId: string | null = null;
      let toAccountId: string | null = null;
      let ledgerType: LedgerEntryType;

      const balanceAfterApproval = await this.executeApprovalBalanceChanges(manager, request, account, amount);

      if (request.type === TransactionRequestType.WITHDRAW) {
        fromAccountId = account.id;
        ledgerType = LedgerEntryType.DEBIT;
      } else {
        toAccountId = account.id;
        ledgerType = LedgerEntryType.CREDIT;
      }

      request.status = TransactionRequestStatus.APPROVED;
      request.approvedById = currentUserId;
      request.approvedAt = new Date();

      const transaction = manager.create(Transaction, {
        fromAccountId,
        toAccountId,
        amount: request.amount,
        fee: '0.00',
        totalAmount: request.amount,
        description: request.description,
        type: request.type === TransactionRequestType.WITHDRAW ? TransactionType.WITHDRAW : TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        requestId: request.id,
      });

      const savedTx = await manager.save(Transaction, transaction);

      await this.transactionsHelper.createLedgerEntries(manager, [
        {
          accountId: account.id,
          transactionId: savedTx.id,
          type: ledgerType,
          amount,
          balanceAfter: balanceAfterApproval,
        }
      ]);

      request.transactionId = savedTx.id;
      await manager.save(TransactionRequest, request);

      return savedTx;
    });
  }

  async rejectRequest(requestId: string, currentUserId: string, rejectionReason: string): Promise<TransactionRequest> {
    return this.transactionsHelper.executeTransaction(async (manager) => {
      const request = await this.validateRejectionRequest(manager, requestId, currentUserId);

      if (request.type === TransactionRequestType.WITHDRAW) {
        await this.executeRejectionHoldRelease(manager, request);
      }

      request.status = TransactionRequestStatus.REJECTED;
      request.approvedById = currentUserId;
      request.approvedAt = new Date();
      request.rejectionReason = rejectionReason;

      return manager.save(TransactionRequest, request);
    });
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  private async validateAdminDepositEligibility(
    manager: EntityManager,
    accountId: string,
    amountStr: string,
  ): Promise<{ account: Account; amount: Decimal }> {
    const account = await this.transactionsHelper.getAccountWithLock(manager, accountId);
    const amount = this.transactionsHelper.validateAmount(amountStr);
    return { account, amount };
  }

  private async createAutoApprovedDeposit(
    manager: EntityManager,
    account: Account,
    amount: Decimal,
    amountStr: string,
    description: string,
    idempotencyKey: string,
    currentUserId: string,
  ): Promise<Transaction> {
    const request = manager.create(TransactionRequest, {
      accountId: account.id,
      amount: amountStr,
      type: TransactionRequestType.DEPOSIT,
      status: TransactionRequestStatus.AUTO_APPROVED,
      description,
      idempotencyKey,
      createdById: currentUserId,
    });
    const savedRequest = await manager.save(TransactionRequest, request);

    const balanceAfterDeposit = await this.transactionsHelper.updateAccountBalance(manager, account.id, amount, 'add');

    const transaction = manager.create(Transaction, {
      toAccountId: account.id,
      amount: amountStr,
      fee: '0.00',
      totalAmount: amountStr,
      description,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      requestId: savedRequest.id,
    });
    const savedTx = await manager.save(Transaction, transaction);

    await this.transactionsHelper.createLedgerEntries(manager, [
      {
        accountId: account.id,
        transactionId: savedTx.id,
        type: LedgerEntryType.CREDIT,
        amount,
        balanceAfter: balanceAfterDeposit,
      }
    ]);

    savedRequest.transactionId = savedTx.id;
    await manager.save(TransactionRequest, savedRequest);

    return savedTx;
  }

  private async validateAdminWithdrawEligibility(
    manager: EntityManager,
    accountId: string,
    amountStr: string,
  ): Promise<{ account: Account; amount: Decimal }> {
    const account = await this.transactionsHelper.getAccountWithLock(manager, accountId);
    const amount = this.transactionsHelper.validateAmount(amountStr, account.balance, account.holdBalance);
    return { account, amount };
  }

  private async createPendingWithdrawRequest(
    manager: EntityManager,
    account: Account,
    amount: Decimal,
    amountStr: string,
    description: string,
    idempotencyKey: string,
    currentUserId: string,
  ): Promise<TransactionRequest> {
    await manager
      .createQueryBuilder()
      .update(Account)
      .set({ holdBalance: () => `"hold_balance" + ${amount.toFixed(2)}` })
      .where('id = :id', { id: account.id })
      .execute();

    const request = manager.create(TransactionRequest, {
      accountId: account.id,
      amount: amountStr,
      type: TransactionRequestType.WITHDRAW,
      status: TransactionRequestStatus.PENDING,
      description,
      idempotencyKey,
      createdById: currentUserId,
    });
    return manager.save(TransactionRequest, request);
  }

  private async createAutoApprovedWithdraw(
    manager: EntityManager,
    account: Account,
    amount: Decimal,
    amountStr: string,
    description: string,
    idempotencyKey: string,
    currentUserId: string,
  ): Promise<Transaction> {
    const request = manager.create(TransactionRequest, {
      accountId: account.id,
      amount: amountStr,
      type: TransactionRequestType.WITHDRAW,
      status: TransactionRequestStatus.AUTO_APPROVED,
      description,
      idempotencyKey,
      createdById: currentUserId,
    });
    const savedRequest = await manager.save(TransactionRequest, request);

    const balanceAfterWithdraw = await this.transactionsHelper.updateAccountBalance(manager, account.id, amount, 'subtract');

    const transaction = manager.create(Transaction, {
      fromAccountId: account.id,
      amount: amountStr,
      fee: '0.00',
      totalAmount: amountStr,
      description,
      type: TransactionType.WITHDRAW,
      status: TransactionStatus.COMPLETED,
      requestId: savedRequest.id,
    });
    const savedTx = await manager.save(Transaction, transaction);

    await this.transactionsHelper.createLedgerEntries(manager, [
      {
        accountId: account.id,
        transactionId: savedTx.id,
        type: LedgerEntryType.DEBIT,
        amount,
        balanceAfter: balanceAfterWithdraw,
      }
    ]);

    savedRequest.transactionId = savedTx.id;
    await manager.save(TransactionRequest, savedRequest);

    return savedTx;
  }

  private async validateApprovalRequest(
    manager: EntityManager,
    requestId: string,
    currentUserId: string,
  ): Promise<TransactionRequest> {
    const request = await manager.findOne(TransactionRequest, {
      where: { id: requestId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!request) {
      throw new NotFoundException('Transaction request not found');
    }

    if (request.status !== TransactionRequestStatus.PENDING) {
      throw new BadRequestException(`Request cannot be approved in its current state: ${request.status}`);
    }

    if (request.createdById === currentUserId) {
      throw new BadRequestException('You cannot approve a transaction request that you created');
    }

    return request;
  }

  private async executeApprovalBalanceChanges(
    manager: EntityManager,
    request: TransactionRequest,
    account: Account,
    amount: Decimal,
  ): Promise<Decimal> {
    if (request.type === TransactionRequestType.WITHDRAW) {
      await manager
        .createQueryBuilder()
        .update(Account)
        .set({
          balance: () => `"balance" - ${amount.toFixed(2)}`,
          holdBalance: () => `"hold_balance" - ${amount.toFixed(2)}`
        })
        .where('id = :id', { id: account.id })
        .execute();

      const updatedAccount = await manager.findOne(Account, { where: { id: account.id } });
      return new Decimal(updatedAccount?.balance ?? 0);
    } else {
      return this.transactionsHelper.updateAccountBalance(manager, account.id, amount, 'add');
    }
  }

  private async validateRejectionRequest(
    manager: EntityManager,
    requestId: string,
    currentUserId: string,
  ): Promise<TransactionRequest> {
    const request = await manager.findOne(TransactionRequest, {
      where: { id: requestId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!request) {
      throw new NotFoundException('Transaction request not found');
    }

    if (request.status !== TransactionRequestStatus.PENDING) {
      throw new BadRequestException(`Request cannot be rejected in its current state: ${request.status}`);
    }

    if (request.createdById === currentUserId) {
      throw new BadRequestException('You cannot reject a transaction request that you created');
    }

    return request;
  }

  private async executeRejectionHoldRelease(
    manager: EntityManager,
    request: TransactionRequest,
  ): Promise<void> {
    const amount = new Decimal(request.amount);
    const account = await this.transactionsHelper.getAccountWithLock(manager, request.accountId);
    await manager
      .createQueryBuilder()
      .update(Account)
      .set({
        holdBalance: () => `"hold_balance" - ${amount.toFixed(2)}`
      })
      .where('id = :id', { id: account.id })
      .execute();
  }

  async getPendingRequestsCount(): Promise<number> {
    return await this.transactionRequestRepository.count({
      where: { status: TransactionRequestStatus.PENDING },
    });
  }

  async getTellerPerformanceToday(): Promise<any[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Fetch all active tellers
    const tellers = await this.dataSource.getRepository(User).find({
      where: { role: UserRole.TELLER },
      select: { id: true, fullName: true, email: true },
    });

    // Query stats grouped by createdById and status
    const stats = await this.transactionRequestRepository.createQueryBuilder('req')
      .select('req.createdById', 'tellerId')
      .addSelect('req.status', 'status')
      .addSelect('COUNT(req.id)', 'count')
      .addSelect('SUM(CAST(req.amount AS NUMERIC))', 'volume')
      .where('req.createdAt >= :startOfDay', { startOfDay })
      .groupBy('req.createdById')
      .addGroupBy('req.status')
      .getRawMany<{ tellerId: string; status: TransactionRequestStatus; count: string; volume: string }>();

    // Map stats to Tellers
    return tellers.map(teller => {
      const tellerStats = stats.filter(s => s.tellerId === teller.id);
      
      const pendingCount = tellerStats
        .filter(s => s.status === TransactionRequestStatus.PENDING)
        .reduce((sum, s) => sum + Number(s.count), 0);

      const completedCount = tellerStats
        .filter(s => s.status === TransactionRequestStatus.APPROVED || s.status === TransactionRequestStatus.AUTO_APPROVED)
        .reduce((sum, s) => sum + Number(s.count), 0);

      const rejectedCount = tellerStats
        .filter(s => s.status === TransactionRequestStatus.REJECTED)
        .reduce((sum, s) => sum + Number(s.count), 0);

      const totalVolume = tellerStats
        .filter(s => s.status === TransactionRequestStatus.APPROVED || s.status === TransactionRequestStatus.AUTO_APPROVED)
        .reduce((sum, s) => sum.plus(new Decimal(s.volume || 0)), new Decimal(0))
        .toFixed(2);

      return {
        tellerId: teller.id,
        tellerName: teller.fullName,
        tellerEmail: teller.email,
        pendingCount,
        completedCount,
        rejectedCount,
        totalVolume,
      };
    });
  }
}
