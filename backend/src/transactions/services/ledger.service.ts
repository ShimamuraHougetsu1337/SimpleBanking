import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LedgerEntry, LedgerEntryType } from '../entities/ledger-entry.entity';
import Decimal from 'decimal.js';

/**
 * Manages the INSERT-only double-entry ledger.
 * This service intentionally exposes NO update or delete methods.
 */
@Injectable()
export class LedgerService {
  /**
   * Creates a pair of ledger entries (DEBIT + CREDIT) for a transfer transaction.
   * Must be called inside an active TypeORM QueryRunner transaction.
   */
  async createTransferEntries(
    manager: EntityManager,
    transactionId: string,
    debitAccountId: string,
    creditAccountId: string,
    amount: Decimal,
    debitBalanceAfter: Decimal,
    creditBalanceAfter: Decimal,
  ): Promise<void> {
    const amountStr = amount.toFixed(2);

    const debitEntry = manager.create(LedgerEntry, {
      accountId: debitAccountId,
      transactionId,
      type: LedgerEntryType.DEBIT,
      amount: amountStr,
      balanceAfter: debitBalanceAfter.toFixed(2),
    });

    const creditEntry = manager.create(LedgerEntry, {
      accountId: creditAccountId,
      transactionId,
      type: LedgerEntryType.CREDIT,
      amount: amountStr,
      balanceAfter: creditBalanceAfter.toFixed(2),
    });

    await manager.save(LedgerEntry, [debitEntry, creditEntry]);
  }

  /**
   * Creates a single ledger entry for a deposit (CREDIT) or withdrawal (DEBIT).
   * Must be called inside an active TypeORM QueryRunner transaction.
   */
  async createSingleEntry(
    manager: EntityManager,
    transactionId: string,
    accountId: string,
    type: LedgerEntryType,
    amount: Decimal,
    balanceAfter: Decimal,
  ): Promise<void> {
    const entry = manager.create(LedgerEntry, {
      accountId,
      transactionId,
      type,
      amount: amount.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
    });

    await manager.save(LedgerEntry, entry);
  }

  /**
   * Calculates the current balance for an account by summing all ledger entries.
   * Used for reconciliation — the source of truth is ledger_entries, not accounts.balance.
   */
  async calculateBalanceFromLedger(
    manager: EntityManager,
    accountId: string,
  ): Promise<Decimal> {
    const result = await manager
      .createQueryBuilder(LedgerEntry, 'le')
      .select(
        `SUM(CASE WHEN le.type = 'credit' THEN le.amount ELSE -le.amount END)`,
        'balance',
      )
      .where('le.account_id = :accountId', { accountId })
      .getRawOne<{ balance: string | null }>();

    return new Decimal(result?.balance ?? 0);
  }
}
