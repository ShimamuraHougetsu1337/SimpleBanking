import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionsHelper } from '../helpers/transactions.helper';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { LedgerEntryType } from '../entities/ledger-entry.entity';
import { TransactionRequest, TransactionRequestType, TransactionRequestStatus } from '../entities/transaction-request.entity';
import { Account } from '@/accounts/entities/account.entity';
import { SystemSetting } from '@/admin/entities/system-setting.entity';
import Decimal from 'decimal.js';

@Injectable()
export class TransactionRequestsService {
  constructor(
    @InjectRepository(TransactionRequest)
    private readonly transactionRequestRepository: Repository<TransactionRequest>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly transactionsHelper: TransactionsHelper,
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
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async adminDeposit(accountId: string, amountStr: string, description: string, idempotencyKey: string, currentUserId: string): Promise<Transaction | TransactionRequest> {
    const existingTx = await this.transactionsHelper.checkIdempotency(idempotencyKey);
    if (existingTx) return existingTx;

    return this.transactionsHelper.executeTransaction(async (manager) => {
      const account = await this.transactionsHelper.getAccountWithLock(manager, accountId);
      const amount = this.transactionsHelper.validateAmount(amountStr);

      const thresholdSetting = await manager.findOne(SystemSetting, { where: { settingKey: 'high_value_transaction_threshold' } });
      const threshold = new Decimal(thresholdSetting?.settingValue || '500000000');

      if (amount.gt(threshold)) {
        // Exceeds threshold -> Pending Approval
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

      // Within threshold -> Auto Approve -> Success
      const request = manager.create(TransactionRequest, {
        accountId,
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
        toAccountId: accountId,
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
          accountId,
          transactionId: savedTx.id,
          type: LedgerEntryType.CREDIT,
          amount,
          balanceAfter: balanceAfterDeposit,
        }
      ]);

      // Link transaction back
      savedRequest.transactionId = savedTx.id;
      await manager.save(TransactionRequest, savedRequest);

      return savedTx;
    });
  }

  async adminWithdraw(accountId: string, amountStr: string, description: string, idempotencyKey: string, currentUserId: string): Promise<Transaction | TransactionRequest> {
    const existingTx = await this.transactionsHelper.checkIdempotency(idempotencyKey);
    if (existingTx) return existingTx;

    return this.transactionsHelper.executeTransaction(async (manager) => {
      const account = await this.transactionsHelper.getAccountWithLock(manager, accountId);
      const amount = this.transactionsHelper.validateAmount(amountStr, account.balance, account.holdBalance);

      const thresholdSetting = await manager.findOne(SystemSetting, { where: { settingKey: 'high_value_transaction_threshold' } });
      const threshold = new Decimal(thresholdSetting?.settingValue || '500000000');

      if (amount.gt(threshold)) {
        // Exceeds threshold -> Pending Approval, INCREASE HOLD BALANCE
        await manager
          .createQueryBuilder()
          .update(Account)
          .set({ holdBalance: () => `"hold_balance" + ${amount.toFixed(2)}` })
          .where('id = :id', { id: account.id })
          .execute();

        const request = manager.create(TransactionRequest, {
          accountId,
          amount: amountStr,
          type: TransactionRequestType.WITHDRAW,
          status: TransactionRequestStatus.PENDING,
          description,
          idempotencyKey,
          createdById: currentUserId,
        });
        return manager.save(TransactionRequest, request);
      }

      // Within threshold -> Auto approve -> Success
      const request = manager.create(TransactionRequest, {
        accountId,
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
        fromAccountId: accountId,
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
          accountId,
          transactionId: savedTx.id,
          type: LedgerEntryType.DEBIT,
          amount,
          balanceAfter: balanceAfterWithdraw,
        }
      ]);

      savedRequest.transactionId = savedTx.id;
      await manager.save(TransactionRequest, savedRequest);

      return savedTx;
    });
  }

  async approveRequest(requestId: string, currentUserId: string): Promise<Transaction> {
    return this.transactionsHelper.executeTransaction(async (manager) => {
      const request = await manager.findOne(TransactionRequest, {
        where: { id: requestId },
        relations: { account: true },
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

      const account = await this.transactionsHelper.getAccountWithLock(manager, request.accountId);
      const amount = new Decimal(request.amount);

      let fromAccountId: string | null = null;
      let toAccountId: string | null = null;
      let ledgerType: LedgerEntryType;
      let balanceAfterApproval: Decimal;

      if (request.type === TransactionRequestType.WITHDRAW) {
        // Need to deduct from both holdBalance and balance
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
        balanceAfterApproval = new Decimal(updatedAccount?.balance ?? 0);
        fromAccountId = account.id;
        ledgerType = LedgerEntryType.DEBIT;
      } else {
        // Deposit
        balanceAfterApproval = await this.transactionsHelper.updateAccountBalance(manager, account.id, amount, 'add');
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

  async rejectRequest(requestId: string, currentUserId: string): Promise<TransactionRequest> {
    return this.transactionsHelper.executeTransaction(async (manager) => {
      const request = await manager.findOne(TransactionRequest, {
        where: { id: requestId },
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

      if (request.type === TransactionRequestType.WITHDRAW) {
        // Release holdBalance
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

      request.status = TransactionRequestStatus.REJECTED;
      request.approvedById = currentUserId;
      request.approvedAt = new Date();

      return manager.save(TransactionRequest, request);
    });
  }
}
