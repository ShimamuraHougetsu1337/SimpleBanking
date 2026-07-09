import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { LedgerEntryType } from '../entities/ledger-entry.entity';
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
      const original = await this.validateReversalEligibility(manager, transactionId);

      const lockedAccounts = await this.lockAccountsForReversal(
        manager,
        original.fromAccountId!,
        original.toAccountId!,
      );
      const fromAccount = lockedAccounts.get(original.fromAccountId!)!;
      const toAccount = lockedAccounts.get(original.toAccountId!)!;

      const amount = new Decimal(original.amount);
      const fee = new Decimal(original.fee);

      const balances = await this.executeReversalBalanceChanges(manager, fromAccount, toAccount, amount, fee);

      const reversalTx = manager.create(Transaction, {
        fromAccountId: toAccount.id, // Reversal flows opposite direction
        toAccountId: fromAccount.id,
        amount: original.amount,
        fee: original.fee,
        totalAmount: original.totalAmount,
        description: `Reversal of transaction ${original.id}`,
        type: TransactionType.REVERSAL,
        status: TransactionStatus.COMPLETED,
        originalTransactionId: original.id,
      });
      const savedReversal = await manager.save(Transaction, reversalTx);

      const suspenseId = await this.transactionsHelper.getSuspenseAccountId();
      const ledgerEntries = this.buildReversalLedgerEntries(
        savedReversal,
        fromAccount,
        toAccount,
        amount,
        fee,
        balances,
        suspenseId,
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
   * Sorts and locks both accounts involved in the reversal.
   */
  private async lockAccountsForReversal(
    manager: EntityManager,
    fromId: string,
    toId: string,
  ): Promise<Map<string, Account>> {
    const accountIdsToLock = [fromId, toId].sort();
    const lockedAccounts = new Map<string, Account>();
    for (const id of accountIdsToLock) {
      const acc = await manager.findOne(Account, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (acc) lockedAccounts.set(id, acc);
    }

    const fromAccount = lockedAccounts.get(fromId);
    const toAccount = lockedAccounts.get(toId);

    if (!fromAccount || !toAccount) {
      throw new NotFoundException('One or both accounts involved in this transaction no longer exist');
    }

    return lockedAccounts;
  }

  /**
   * Conducts balance checks and performs subtract/add database operations.
   */
  private async executeReversalBalanceChanges(
    manager: EntityManager,
    fromAccount: Account,
    toAccount: Account,
    amount: Decimal,
    fee: Decimal,
  ): Promise<{ toBalanceAfter: Decimal; fromBalanceAfterAmount: Decimal; fromBalanceAfterFee: Decimal }> {
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

    let fromBalanceAfterFee = fromBalanceAfterAmount;
    if (fee.gt(0)) {
      fromBalanceAfterFee = await this.transactionsHelper.updateAccountBalance(
        manager,
        fromAccount.id,
        fee,
        'add',
      );
    }

    return {
      toBalanceAfter,
      fromBalanceAfterAmount,
      fromBalanceAfterFee,
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
    fee: Decimal,
    balances: { toBalanceAfter: Decimal; fromBalanceAfterAmount: Decimal; fromBalanceAfterFee: Decimal },
    suspenseId: string,
  ): {
    accountId: string;
    transactionId: string;
    type: LedgerEntryType;
    amount: Decimal;
    balanceAfter: Decimal;
  }[] {
    const ledgerEntries = [
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

    if (fee.gt(0)) {
      ledgerEntries.push({
        accountId: fromAccount.id, // Credit original sender (refunds fee)
        transactionId: savedReversal.id,
        type: LedgerEntryType.CREDIT,
        amount: fee,
        balanceAfter: balances.fromBalanceAfterFee,
      });

      ledgerEntries.push({
        accountId: suspenseId, // Debit SYS_FEE_SUSPENSE (reverses original fee credit)
        transactionId: savedReversal.id,
        type: LedgerEntryType.DEBIT,
        amount: fee,
        balanceAfter: new Decimal(0),
      });
    }

    return ledgerEntries;
  }
}
