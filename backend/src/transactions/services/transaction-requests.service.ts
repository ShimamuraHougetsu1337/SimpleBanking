import { Injectable, BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { TransactionsHelper } from '../helpers/transactions.helper';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { LedgerEntryType } from '../entities/ledger-entry.entity';
import { TransactionRequest, TransactionRequestType, TransactionRequestStatus } from '../entities/transaction-request.entity';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';
import { SystemSettingsService } from '@/system-settings/system-settings.service';
import { ReversalService } from './reversal.service';
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
    private readonly reversalService: ReversalService,
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
        originalTransactionId: req.originalTransactionId,
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

  async adminTransfer(
    fromAccountId: string,
    toAccountNumber: string,
    amountStr: string,
    description: string,
    idempotencyKey: string,
    currentUserId: string,
  ): Promise<Transaction | TransactionRequest> {
    const existingTx = await this.transactionsHelper.checkIdempotency(idempotencyKey);
    if (existingTx) return existingTx;

    return this.transactionsHelper.executeTransaction(async (manager) => {
      const { fromAccount, toAccount, amount, feeValue } = await this.validateAdminTransferEligibility(
        manager,
        fromAccountId,
        toAccountNumber,
        amountStr,
      );

      const thresholdVal = this.systemSettingsService.getSetting<number>('high_value_transaction_threshold');
      const threshold = new Decimal(thresholdVal ?? 500000000);

      if (amount.gt(threshold)) {
        return this.createPendingTransferRequest(
          manager,
          fromAccount,
          toAccount.accountNumber,
          amount,
          feeValue,
          amountStr,
          description,
          idempotencyKey,
          currentUserId,
        );
      }

      return this.createAutoApprovedTransfer(
        manager,
        fromAccount,
        toAccount,
        amount,
        feeValue,
        amountStr,
        description,
        idempotencyKey,
        currentUserId,
      );
    });
  }

  async approveRequest(requestId: string, currentUserId: string): Promise<Transaction> {
    return this.transactionsHelper.executeTransaction(async (manager) => {
      const request = await this.validateApprovalRequest(manager, requestId, currentUserId);
      const amount = new Decimal(request.amount);

      let savedTx: Transaction;

      if (request.type === TransactionRequestType.REVERSAL) {
        // For REVERSAL: load the original transaction and call executeReversal
        const original = await manager.findOne(Transaction, {
          where: { id: request.originalTransactionId! },
          relations: { fromAccount: true, toAccount: true },
        });
        if (!original) {
          throw new NotFoundException(`Original transaction ${request.originalTransactionId} not found`);
        }
        savedTx = await this.reversalService.executeReversal(manager, original, request);
      } else {
        const account = await this.transactionsHelper.getAccountWithLock(manager, request.accountId);

        if (request.type === TransactionRequestType.DEPOSIT) {
          savedTx = await this.executeApprovedDeposit(manager, request, account, amount);
        } else if (request.type === TransactionRequestType.WITHDRAW) {
          savedTx = await this.executeApprovedWithdraw(manager, request, account, amount);
        } else if (request.type === TransactionRequestType.TRANSFER) {
          savedTx = await this.executeApprovedTransfer(manager, request, account, amount);
        } else {
          throw new BadRequestException('Unsupported transaction request type');
        }
      }

      request.status = TransactionRequestStatus.APPROVED;
      request.approvedById = currentUserId;
      request.approvedAt = new Date();
      request.transactionId = savedTx.id;
      await manager.save(TransactionRequest, request);

      return savedTx;
    });
  }

  private async executeApprovedDeposit(
    manager: EntityManager,
    request: TransactionRequest,
    account: Account,
    amount: Decimal,
  ): Promise<Transaction> {
    const balanceAfterDeposit = await this.transactionsHelper.updateAccountBalance(manager, account.id, amount, 'add');

    const transaction = manager.create(Transaction, {
      toAccountId: account.id,
      amount: request.amount,
      fee: '0.00',
      totalAmount: request.amount,
      description: request.description,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      requestId: request.id,
    });
    const savedTx = await manager.save(Transaction, transaction);

    const cashVaultId = await this.transactionsHelper.getCashVaultAccountId();

    await this.transactionsHelper.createLedgerEntries(manager, [
      {
        accountId: account.id,
        transactionId: savedTx.id,
        type: LedgerEntryType.CREDIT,
        amount,
        balanceAfter: balanceAfterDeposit,
      },
      {
        accountId: cashVaultId,
        transactionId: savedTx.id,
        type: LedgerEntryType.DEBIT,
        amount,
        balanceAfter: new Decimal(0),
      }
    ]);

    return savedTx;
  }

  private async executeApprovedWithdraw(
    manager: EntityManager,
    request: TransactionRequest,
    account: Account,
    amount: Decimal,
  ): Promise<Transaction> {
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
    const balanceAfterWithdraw = new Decimal(updatedAccount?.balance ?? 0);

    const transaction = manager.create(Transaction, {
      fromAccountId: account.id,
      amount: request.amount,
      fee: '0.00',
      totalAmount: request.amount,
      description: request.description,
      type: TransactionType.WITHDRAW,
      status: TransactionStatus.COMPLETED,
      requestId: request.id,
    });
    const savedTx = await manager.save(Transaction, transaction);

    const cashVaultId = await this.transactionsHelper.getCashVaultAccountId();

    await this.transactionsHelper.createLedgerEntries(manager, [
      {
        accountId: account.id,
        transactionId: savedTx.id,
        type: LedgerEntryType.DEBIT,
        amount,
        balanceAfter: balanceAfterWithdraw,
      },
      {
        accountId: cashVaultId,
        transactionId: savedTx.id,
        type: LedgerEntryType.CREDIT,
        amount,
        balanceAfter: new Decimal(0),
      }
    ]);

    return savedTx;
  }

  private async executeApprovedTransfer(
    manager: EntityManager,
    request: TransactionRequest,
    account: Account,
    amount: Decimal,
  ): Promise<Transaction> {
    const toAccountNumber = request.toAccountNumber;
    if (!toAccountNumber) {
      throw new BadRequestException('Destination account number is missing in request');
    }
    const toAccount = await manager.findOne(Account, {
      where: { accountNumber: toAccountNumber },
    });
    if (!toAccount) {
      throw new NotFoundException('Destination account not found');
    }
    if (toAccount.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException('Destination account is not active');
    }

    // Lock destination account as well to prevent race conditions
    await this.transactionsHelper.lockAccounts(manager, account.id, toAccount.id);

    const feeVal = this.systemSettingsService.getSetting<number>('transfer_fee');
    const feeValue = new Decimal(feeVal ?? 0);
    const totalAmount = amount.plus(feeValue);

    // Subtract from source
    await manager
      .createQueryBuilder()
      .update(Account)
      .set({
        balance: () => `"balance" - ${totalAmount.toFixed(2)}`,
        holdBalance: () => `"hold_balance" - ${totalAmount.toFixed(2)}`
      })
      .where('id = :id', { id: account.id })
      .execute();

    const updatedFromAccount = await manager.findOne(Account, { where: { id: account.id } });
    const balanceAfterFromAmount = new Decimal(updatedFromAccount?.balance ?? 0).plus(feeValue);
    const balanceAfterFromTotal = new Decimal(updatedFromAccount?.balance ?? 0);

    // Add to destination
    await manager
      .createQueryBuilder()
      .update(Account)
      .set({ balance: () => `"balance" + ${amount.toFixed(2)}` })
      .where('id = :id', { id: toAccount.id })
      .execute();

    const updatedToAccount = await manager.findOne(Account, { where: { id: toAccount.id } });
    const balanceAfterTo = new Decimal(updatedToAccount?.balance ?? 0);

    const transaction = manager.create(Transaction, {
      fromAccountId: account.id,
      toAccountId: toAccount.id,
      amount: request.amount,
      fee: feeValue.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      description: request.description,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.COMPLETED,
      requestId: request.id,
    });
    const savedTx = await manager.save(Transaction, transaction);

    const ledgerEntries = [
      {
        accountId: account.id,
        transactionId: savedTx.id,
        type: LedgerEntryType.DEBIT,
        amount,
        balanceAfter: balanceAfterFromAmount,
      },
      {
        accountId: toAccount.id,
        transactionId: savedTx.id,
        type: LedgerEntryType.CREDIT,
        amount,
        balanceAfter: balanceAfterTo,
      },
    ];

    if (feeValue.gt(0)) {
      const suspenseAccountId = await this.transactionsHelper.getSuspenseAccountId();
      
      ledgerEntries.push(
        {
          accountId: account.id,
          transactionId: savedTx.id,
          type: LedgerEntryType.DEBIT,
          amount: feeValue,
          balanceAfter: balanceAfterFromTotal,
        },
        {
          accountId: suspenseAccountId,
          transactionId: savedTx.id,
          type: LedgerEntryType.CREDIT,
          amount: feeValue,
          balanceAfter: new Decimal(0),
        },
      );
    }

    await this.transactionsHelper.createLedgerEntries(manager, ledgerEntries);

    return savedTx;
  }

  async rejectRequest(requestId: string, currentUserId: string, rejectionReason: string): Promise<TransactionRequest> {
    return this.transactionsHelper.executeTransaction(async (manager) => {
      const request = await this.validateRejectionRequest(manager, requestId, currentUserId);

      if (request.type === TransactionRequestType.REVERSAL) {
        // Release the hold placed on recipient's account when reversal was requested
        await this.reversalService.releaseReversalHold(manager, request);
      } else if (
        request.type === TransactionRequestType.WITHDRAW ||
        request.type === TransactionRequestType.TRANSFER
      ) {
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

    const cashVaultId = await this.transactionsHelper.getCashVaultAccountId();

    await this.transactionsHelper.createLedgerEntries(manager, [
      {
        accountId: account.id,
        transactionId: savedTx.id,
        type: LedgerEntryType.CREDIT,
        amount,
        balanceAfter: balanceAfterDeposit,
      },
      {
        accountId: cashVaultId,
        transactionId: savedTx.id,
        type: LedgerEntryType.DEBIT,
        amount,
        balanceAfter: new Decimal(0),
      }
    ]);

    savedRequest.transactionId = savedTx.id;
    await manager.save(TransactionRequest, savedRequest);

    return savedTx;
  }

  private async validateAdminTransferEligibility(
    manager: EntityManager,
    fromAccountId: string,
    toAccountNumber: string,
    amountStr: string,
  ): Promise<{ fromAccount: Account; toAccount: Account; amount: Decimal; feeValue: Decimal }> {
    const fromAccount = await this.transactionsHelper.getAccountWithLock(manager, fromAccountId);

    const toAccount = await manager.findOne(Account, {
      where: { accountNumber: toAccountNumber },
    });
    if (!toAccount) {
      throw new NotFoundException('Destination account does not exist');
    }
    if (toAccount.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException('Destination account is not active');
    }
    if (fromAccount.id === toAccount.id) {
      throw new BadRequestException('Source and destination accounts must be different');
    }

    const amount = this.transactionsHelper.validateAmount(amountStr);

    const feeVal = this.systemSettingsService.getSetting<number>('transfer_fee');
    const feeValue = new Decimal(feeVal ?? 0);
    const totalAmount = amount.plus(feeValue);

    const available = new Decimal(fromAccount.balance).minus(new Decimal(fromAccount.holdBalance));
    if (totalAmount.gt(available)) {
      throw new UnprocessableEntityException('Số dư tài khoản khả dụng không đủ (bao gồm cả phí chuyển khoản)');
    }

    return { fromAccount, toAccount, amount, feeValue };
  }

  private async createPendingTransferRequest(
    manager: EntityManager,
    fromAccount: Account,
    toAccountNumber: string,
    amount: Decimal,
    feeValue: Decimal,
    amountStr: string,
    description: string,
    idempotencyKey: string,
    currentUserId: string,
  ): Promise<TransactionRequest> {
    const totalAmount = amount.plus(feeValue);
    await manager
      .createQueryBuilder()
      .update(Account)
      .set({ holdBalance: () => `"hold_balance" + ${totalAmount.toFixed(2)}` })
      .where('id = :id', { id: fromAccount.id })
      .execute();

    const request = manager.create(TransactionRequest, {
      accountId: fromAccount.id,
      toAccountNumber,
      amount: amountStr,
      type: TransactionRequestType.TRANSFER,
      status: TransactionRequestStatus.PENDING,
      description,
      idempotencyKey,
      createdById: currentUserId,
    });
    return manager.save(TransactionRequest, request);
  }

  private async createAutoApprovedTransfer(
    manager: EntityManager,
    fromAccount: Account,
    toAccount: Account,
    amount: Decimal,
    feeValue: Decimal,
    amountStr: string,
    description: string,
    idempotencyKey: string,
    currentUserId: string,
  ): Promise<Transaction> {
    const request = manager.create(TransactionRequest, {
      accountId: fromAccount.id,
      toAccountNumber: toAccount.accountNumber,
      amount: amountStr,
      type: TransactionRequestType.TRANSFER,
      status: TransactionRequestStatus.AUTO_APPROVED,
      description,
      idempotencyKey,
      createdById: currentUserId,
    });
    const savedRequest = await manager.save(TransactionRequest, request);

    const balanceAfterFromAmount = await this.transactionsHelper.updateAccountBalance(
      manager,
      fromAccount.id,
      amount,
      'subtract',
    );
    let balanceAfterFromTotal = balanceAfterFromAmount;
    if (feeValue.gt(0)) {
      balanceAfterFromTotal = await this.transactionsHelper.updateAccountBalance(
        manager,
        fromAccount.id,
        feeValue,
        'subtract',
      );
    }
    const balanceAfterTo = await this.transactionsHelper.updateAccountBalance(
      manager,
      toAccount.id,
      amount,
      'add',
    );

    const transaction = manager.create(Transaction, {
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      amount: amountStr,
      fee: feeValue.toFixed(2),
      totalAmount: amount.plus(feeValue).toFixed(2),
      description,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.COMPLETED,
      requestId: savedRequest.id,
    });
    const savedTx = await manager.save(Transaction, transaction);

    const ledgerEntries = [
      {
        accountId: fromAccount.id,
        transactionId: savedTx.id,
        type: LedgerEntryType.DEBIT,
        amount,
        balanceAfter: balanceAfterFromAmount,
      },
      {
        accountId: toAccount.id,
        transactionId: savedTx.id,
        type: LedgerEntryType.CREDIT,
        amount,
        balanceAfter: balanceAfterTo,
      },
    ];

    if (feeValue.gt(0)) {
      const suspenseAccountId = await this.transactionsHelper.getSuspenseAccountId();
      
      ledgerEntries.push(
        {
          accountId: fromAccount.id,
          transactionId: savedTx.id,
          type: LedgerEntryType.DEBIT,
          amount: feeValue,
          balanceAfter: balanceAfterFromTotal,
        },
        {
          accountId: suspenseAccountId,
          transactionId: savedTx.id,
          type: LedgerEntryType.CREDIT,
          amount: feeValue,
          balanceAfter: new Decimal(0),
        },
      );
    }

    await this.transactionsHelper.createLedgerEntries(manager, ledgerEntries);

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

    const cashVaultId = await this.transactionsHelper.getCashVaultAccountId();

    await this.transactionsHelper.createLedgerEntries(manager, [
      {
        accountId: account.id,
        transactionId: savedTx.id,
        type: LedgerEntryType.DEBIT,
        amount,
        balanceAfter: balanceAfterWithdraw,
      },
      {
        accountId: cashVaultId,
        transactionId: savedTx.id,
        type: LedgerEntryType.CREDIT,
        amount,
        balanceAfter: new Decimal(0),
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
