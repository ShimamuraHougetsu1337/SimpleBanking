import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { LedgerEntryType } from '../entities/ledger-entry.entity';
import { Account } from '@/accounts/entities/account.entity';
import { TransactionsHelper } from '../helpers/transactions.helper';
import { TransactionRequest, TransactionRequestStatus, TransactionRequestType } from '../entities/transaction-request.entity';
import Decimal from 'decimal.js';

@Injectable()
export class ReversalService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(TransactionRequest)
    private readonly requestRepository: Repository<TransactionRequest>,
    private readonly transactionsHelper: TransactionsHelper,
  ) {}

  /**
   * Creates a REVERSAL request (Teller-initiated, Manager must approve).
   *
   * Business rules enforced:
   * 1. Only COMPLETED TRANSFER transactions can have a reversal requested.
   * 2. A transaction can only have one reversal request (no duplicate requests).
   * 3. Recipient account must have sufficient available balance to hold the disputed amount.
   * 4. Locks (holds) the disputed amount on the recipient's account until Manager decision.
   */
  async requestReversal(
    transactionId: string,
    requesterId: string,
    reason: string,
  ): Promise<TransactionRequest> {
    return this.transactionsHelper.executeTransaction(async (manager) => {
      const original = await this.validateReversalEligibility(manager, transactionId);

      // Check for existing pending reversal request to prevent duplicates
      const existingRequest = await manager.findOne(TransactionRequest, {
        where: { originalTransactionId: transactionId, type: TransactionRequestType.REVERSAL },
      });
      if (existingRequest) {
        throw new BadRequestException(
          `A reversal request for transaction ${transactionId} already exists (request ID: ${existingRequest.id})`,
        );
      }

      // Lock the recipient account (toAccount = person who received money and needs to return it)
      const toAccount = await this.transactionsHelper.getAccountWithLock(manager, original.toAccountId!);
      const amount = new Decimal(original.amount);

      // Strict check: recipient must have enough available balance to hold
      const toBalance = new Decimal(toAccount.balance);
      const toHold = new Decimal(toAccount.holdBalance || 0);
      const toAvailable = toBalance.minus(toHold);
      if (amount.gt(toAvailable)) {
        throw new UnprocessableEntityException(
          `Recipient account does not have sufficient available balance to hold the disputed amount. ` +
          `Required: ${amount.toFixed(2)}, Available: ${toAvailable.toFixed(2)}`,
        );
      }

      // Place a hold on recipient's account for the disputed amount
      await manager
        .createQueryBuilder()
        .update(Account)
        .set({ holdBalance: () => `"hold_balance" + ${amount.toFixed(2)}` })
        .where('id = :id', { id: toAccount.id })
        .execute();

      // Create the pending reversal request
      const request = manager.create(TransactionRequest, {
        accountId: original.fromAccountId!, // accountId = original sender (beneficiary of reversal)
        originalTransactionId: transactionId,
        amount: original.amount,
        type: TransactionRequestType.REVERSAL,
        status: TransactionRequestStatus.PENDING,
        description: reason,
        createdById: requesterId,
      });

      return manager.save(TransactionRequest, request);
    });
  }

  /**
   * Executes the actual reversal when Manager approves a reversal request.
   * Called by TransactionRequestsService.approveRequest() for REVERSAL type.
   *
   * @param manager - EntityManager from the wrapping transaction
   * @param original - The original COMPLETED TRANSFER transaction
   * @param request - The PENDING reversal request (used to release hold after reversal)
   */
  async executeReversal(
    manager: EntityManager,
    original: Transaction,
    request: TransactionRequest,
  ): Promise<Transaction> {
    const fromAccountId = original.fromAccountId!;
    const toAccountId = original.toAccountId!;

    const lockedAccounts = await this.transactionsHelper.lockAccounts(
      manager,
      fromAccountId,
      toAccountId,
    );
    const fromAccount = lockedAccounts.get(fromAccountId);
    const toAccount = lockedAccounts.get(toAccountId);

    if (!fromAccount || !toAccount) {
      throw new NotFoundException('One or both accounts involved in this transaction no longer exist');
    }

    const amount = new Decimal(original.amount);

    const balances = await this.executeReversalBalanceChanges(manager, fromAccount, toAccount, amount);

    // Release the hold placed during requestReversal
    await manager
      .createQueryBuilder()
      .update(Account)
      .set({ holdBalance: () => `"hold_balance" - ${amount.toFixed(2)}` })
      .where('id = :id', { id: toAccount.id })
      .execute();

    const reversalTx = manager.create(Transaction, {
      fromAccountId: toAccount.id,
      toAccountId: fromAccount.id,
      amount: original.amount,
      fee: '0.00',
      totalAmount: original.amount,
      description: `Reversal of transaction ${original.id} — ${request.description}`,
      type: TransactionType.REVERSAL,
      status: TransactionStatus.COMPLETED,
      originalTransactionId: original.id,
      requestId: request.id,
    });
    const savedReversal = await manager.save(Transaction, reversalTx);

    const ledgerEntries = this.buildReversalLedgerEntries(
      savedReversal,
      fromAccount,
      toAccount,
      amount,
      balances,
    );

    await this.transactionsHelper.createLedgerEntries(manager, ledgerEntries);

    await manager
      .createQueryBuilder()
      .update(Transaction)
      .set({ status: TransactionStatus.REVERSED })
      .where('id = :id', { id: original.id })
      .execute();

    return savedReversal;
  }

  /**
   * Releases the hold on the recipient's account when a reversal request is rejected.
   * Called by TransactionRequestsService.rejectRequest() for REVERSAL type.
   */
  async releaseReversalHold(manager: EntityManager, request: TransactionRequest): Promise<void> {
    // The hold was placed on toAccount (recipient of original tx)
    // We need to find the original tx to get the toAccountId
    const original = await manager.findOne(Transaction, {
      where: { id: request.originalTransactionId! },
    });
    if (!original?.toAccountId) return;

    const amount = new Decimal(request.amount);
    await manager
      .createQueryBuilder()
      .update(Account)
      .set({ holdBalance: () => `"hold_balance" - ${amount.toFixed(2)}` })
      .where('id = :id', { id: original.toAccountId })
      .execute();
  }

  /**
   * Direct reversal for Manager/SuperAdmin (no request flow needed).
   * Existing endpoint: POST /transactions/:id/reverse
   */
  async reverseTransaction(transactionId: string): Promise<Transaction> {
    return this.transactionsHelper.executeTransaction(async (manager) => {
      const original = await this.validateReversalEligibility(manager, transactionId);

      const fromAccountId = original.fromAccountId;
      const toAccountId = original.toAccountId;
      if (!fromAccountId || !toAccountId) {
        throw new UnprocessableEntityException('Cannot reverse a non-transfer transaction');
      }

      const lockedAccounts = await this.transactionsHelper.lockAccounts(
        manager,
        fromAccountId,
        toAccountId,
      );
      const fromAccount = lockedAccounts.get(fromAccountId);
      const toAccount = lockedAccounts.get(toAccountId);

      if (!fromAccount || !toAccount) {
        throw new NotFoundException('One or both accounts involved in this transaction no longer exist');
      }

      const amount = new Decimal(original.amount);

      const balances = await this.executeReversalBalanceChanges(manager, fromAccount, toAccount, amount);

      const reversalTx = manager.create(Transaction, {
        fromAccountId: toAccount.id,
        toAccountId: fromAccount.id,
        amount: original.amount,
        fee: '0.00',
        totalAmount: original.amount,
        description: `Reversal of transaction ${original.id}`,
        type: TransactionType.REVERSAL,
        status: TransactionStatus.COMPLETED,
        originalTransactionId: original.id,
      });
      const savedReversal = await manager.save(Transaction, reversalTx);

      const ledgerEntries = this.buildReversalLedgerEntries(
        savedReversal,
        fromAccount,
        toAccount,
        amount,
        balances,
      );

      await this.transactionsHelper.createLedgerEntries(manager, ledgerEntries);

      await manager
        .createQueryBuilder()
        .update(Transaction)
        .set({ status: TransactionStatus.REVERSED })
        .where('id = :id', { id: original.id })
        .execute();

      return savedReversal;
    });
  }

  /**
   * Validates if the original transaction can be reversed.
   */
  private async validateReversalEligibility(manager: EntityManager, transactionId: string): Promise<Transaction> {
    const original = await manager.findOne(Transaction, {
      where: { id: transactionId },
      relations: { fromAccount: true, toAccount: true },
    });

    if (!original) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    if (original.status !== TransactionStatus.COMPLETED) {
      throw new UnprocessableEntityException(
        `Only COMPLETED transactions can be reversed. Current status: ${original.status}`,
      );
    }

    if (original.type !== TransactionType.TRANSFER) {
      throw new UnprocessableEntityException(
        'Only TRANSFER transactions can be reversed via this endpoint',
      );
    }

    const existingReversal = await manager.findOne(Transaction, {
      where: { originalTransactionId: transactionId, type: TransactionType.REVERSAL },
    });

    if (existingReversal) {
      throw new BadRequestException(
        `Transaction ${transactionId} has already been reversed (reversal ID: ${existingReversal.id})`,
      );
    }

    if (!original.fromAccountId || !original.toAccountId) {
      throw new UnprocessableEntityException('Cannot reverse a non-transfer transaction');
    }

    return original;
  }



  /**
   * Conducts balance checks and performs subtract/add database operations.
   */
  private async executeReversalBalanceChanges(
    manager: EntityManager,
    fromAccount: Account,
    toAccount: Account,
    amount: Decimal,
  ): Promise<{ toBalanceAfter: Decimal; fromBalanceAfterAmount: Decimal }> {
    if (amount.gt(toAccount.balance)) {
      throw new UnprocessableEntityException(
        'Insufficient balance in destination account to complete the reversal',
      );
    }

    const toBalanceAfter = await this.transactionsHelper.updateAccountBalance(
      manager,
      toAccount.id,
      amount,
      'subtract',
    );

    const fromBalanceAfterAmount = await this.transactionsHelper.updateAccountBalance(
      manager,
      fromAccount.id,
      amount,
      'add',
    );

    return {
      toBalanceAfter,
      fromBalanceAfterAmount,
    };
  }

  /**
   * Generates ledger entries for the reversal transaction.
   */
  private buildReversalLedgerEntries(
    savedReversal: Transaction,
    fromAccount: Account,
    toAccount: Account,
    amount: Decimal,
    balances: { toBalanceAfter: Decimal; fromBalanceAfterAmount: Decimal },
  ): {
    accountId: string;
    transactionId: string;
    type: LedgerEntryType;
    amount: Decimal;
    balanceAfter: Decimal;
  }[] {
    return [
      {
        accountId: toAccount.id, // Debit original receiver (takes money back)
        transactionId: savedReversal.id,
        type: LedgerEntryType.DEBIT,
        amount,
        balanceAfter: balances.toBalanceAfter,
      },
      {
        accountId: fromAccount.id, // Credit original sender (refunds amount)
        transactionId: savedReversal.id,
        type: LedgerEntryType.CREDIT,
        amount,
        balanceAfter: balances.fromBalanceAfterAmount,
      },
    ];
  }
}
