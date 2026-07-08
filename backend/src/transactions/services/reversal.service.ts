import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { LedgerEntry, LedgerEntryType } from '../entities/ledger-entry.entity';
import { Account } from '@/accounts/entities/account.entity';
import { TransactionsHelper } from '../helpers/transactions.helper';
import Decimal from 'decimal.js';

@Injectable()
export class ReversalService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly transactionsHelper: TransactionsHelper,
  ) {}

  /**
   * Reverses a COMPLETED transfer transaction.
   *
   * Business rules enforced:
   * 1. Only COMPLETED transactions of type TRANSFER can be reversed.
   * 2. A transaction can only be reversed once (no reversal of reversals).
   * 3. Creates a new REVERSAL transaction instead of mutating the original.
   * 4. Marks the original transaction as REVERSED (status update only, no amount change).
   * 5. Writes double-entry ledger entries for the reversal.
   */
  async reverseTransaction(transactionId: string): Promise<Transaction> {
    return this.transactionsHelper.executeTransaction(async (manager) => {
      // Load original transaction
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

      // Prevent double reversal: check if a reversal already exists for this transaction
      const existingReversal = await manager.findOne(Transaction, {
        where: { originalTransactionId: transactionId, type: TransactionType.REVERSAL },
      });

      if (existingReversal) {
        throw new BadRequestException(
          `Transaction ${transactionId} has already been reversed (reversal ID: ${existingReversal.id})`,
        );
      }

      // Validate that both accounts still exist
      if (!original.fromAccountId || !original.toAccountId) {
        throw new UnprocessableEntityException('Cannot reverse a non-transfer transaction');
      }

      // Sort accounts consistently to avoid deadlocks
      const accountIdsToLock = [original.fromAccountId, original.toAccountId].sort();
      const lockedAccounts = new Map<string, Account>();
      for (const id of accountIdsToLock) {
        const acc = await manager.findOne(Account, { where: { id }, lock: { mode: 'pessimistic_write' } });
        if (acc) lockedAccounts.set(id, acc);
      }

      const fromAccount = lockedAccounts.get(original.fromAccountId);
      const toAccount = lockedAccounts.get(original.toAccountId);

      if (!fromAccount || !toAccount) {
        throw new NotFoundException('One or both accounts involved in this transaction no longer exist');
      }

      // Check destination (original sender) has enough balance for the refund
      const reversalAmount = new Decimal(original.totalAmount); // Refund full amount including fee
      const receiverBalance = new Decimal(toAccount.balance);
      if (reversalAmount.gt(receiverBalance)) {
        throw new UnprocessableEntityException(
          'Insufficient balance in destination account to complete the reversal',
        );
      }

      // Debit the original receiver (they give back the money)
      const toBalanceAfter = await this.transactionsHelper.updateAccountBalance(
        manager, toAccount.id, reversalAmount, 'subtract',
      );

      // Credit the original sender (they get refunded)
      const fromBalanceAfter = await this.transactionsHelper.updateAccountBalance(
        manager, fromAccount.id, reversalAmount, 'add',
      );

      // Create the reversal transaction (new record, do not mutate original)
      const reversalTx = manager.create(Transaction, {
        fromAccountId: toAccount.id,   // Reversal flows opposite direction
        toAccountId: fromAccount.id,
        amount: original.totalAmount,
        fee: '0.00',
        totalAmount: original.totalAmount,
        description: `Reversal of transaction ${original.id}`,
        type: TransactionType.REVERSAL,
        status: TransactionStatus.COMPLETED,
        originalTransactionId: original.id,
      });
      const savedReversal = await manager.save(Transaction, reversalTx);

      // Write double-entry ledger for the reversal
      const reversalAmountStr = reversalAmount.toFixed(2);
      const debitEntry = manager.create(LedgerEntry, {
        accountId: toAccount.id,
        transactionId: savedReversal.id,
        type: LedgerEntryType.DEBIT,
        amount: reversalAmountStr,
        balanceAfter: toBalanceAfter.toFixed(2),
      });
      const creditEntry = manager.create(LedgerEntry, {
        accountId: fromAccount.id,
        transactionId: savedReversal.id,
        type: LedgerEntryType.CREDIT,
        amount: reversalAmountStr,
        balanceAfter: fromBalanceAfter.toFixed(2),
      });
      await manager.save(LedgerEntry, [debitEntry, creditEntry]);

      // Mark the original transaction as REVERSED (status update only — immutable ledger unchanged)
      await manager
        .createQueryBuilder()
        .update(Transaction)
        .set({ status: TransactionStatus.REVERSED })
        .where('id = :id', { id: original.id })
        .execute();

      return savedReversal;
    });
  }
}
