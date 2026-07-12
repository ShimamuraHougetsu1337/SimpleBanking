import { Injectable, BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, SelectQueryBuilder, Brackets } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';
import { LedgerEntry, LedgerEntryType } from '../entities/ledger-entry.entity';
import { SystemAccount } from '@/common/enums/system-account.enum';
import { SystemSettingsService } from '@/system-settings/system-settings.service';
import Decimal from 'decimal.js';

@Injectable()
export class TransactionsHelper {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly systemSettingsService: SystemSettingsService,
  ) { }

  /** Cached suspense account ID — loaded once on first use. */
  private suspenseAccountId: string | null = null;

  /**
   * Returns the ID of the SYS_FEE_SUSPENSE internal account.
   * The result is cached in memory after the first DB lookup.
   */
  async getSuspenseAccountId(): Promise<string> {
    if (this.suspenseAccountId) return this.suspenseAccountId;

    const account = await this.dataSource.getRepository(Account).findOne({
      where: { accountNumber: SystemAccount.FEE_SUSPENSE as string },
      withDeleted: false,
    });

    if (!account) {
      throw new Error(`${SystemAccount.FEE_SUSPENSE} account not found. Please run the seed script.`);
    }

    this.suspenseAccountId = account.id;
    return this.suspenseAccountId;
  }

  async executeTransaction<T>(operation: (manager: EntityManager) => Promise<T>): Promise<T> {
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

  async checkIdempotency(key: string): Promise<Transaction | null> {
    return this.dataSource.getRepository(Transaction).findOne({ where: { idempotencyKey: key } });
  }

  async getAccountWithLock(manager: EntityManager, accountId: string, userId?: string): Promise<Account> {
    const where: import('typeorm').FindOptionsWhere<Account> = { id: accountId, status: AccountStatus.ACTIVE };
    if (userId) where.userId = userId;

    const account = await manager.findOne(Account, { where, lock: { mode: 'pessimistic_write' } });
    if (!account) {
      throw new NotFoundException('Account not found or is locked');
    }
    return account;
  }

  validateAmount(amountStr: string | number, balanceStr?: string | number, holdBalanceStr?: string | number): Decimal {
    const amount = new Decimal(amountStr);
    if (amount.lte(0)) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    if (amount.decimalPlaces() > 2) {
      throw new BadRequestException('Amount has a maximum of 2 decimal places');
    }
    if (balanceStr !== undefined) {
      const balance = new Decimal(balanceStr);
      const holdBalance = new Decimal(holdBalanceStr || 0);
      const availableBalance = balance.minus(holdBalance);
      if (amount.gt(availableBalance)) {
        throw new UnprocessableEntityException('Số dư tài khoản khả dụng không đủ');
      }
    }
    return amount;
  }

  /**
   * Updates an account balance and returns the new balance after the operation.
   * If the accountId belongs to the SYS_FEE_SUSPENSE account, this is a no-op
   * (no DB lock, no balance update) and returns Decimal(0) as a sentinel.
   */
  async updateAccountBalance(
    manager: EntityManager,
    accountId: string,
    amount: Decimal,
    operation: 'add' | 'subtract',
  ): Promise<Decimal> {
    const suspenseId = await this.getSuspenseAccountId();
    if (accountId === suspenseId) {
      // Suspense account: INSERT-only ledger entries, never update balance to avoid lock contention.
      return new Decimal(0);
    }

    const sign = operation === 'add' ? '+' : '-';
    await manager
      .createQueryBuilder()
      .update(Account)
      .set({ balance: () => `balance ${sign} ${amount.toFixed(2)}` })
      .where('id = :id', { id: accountId })
      .execute();

    const updated = await manager.findOne(Account, { where: { id: accountId } });
    return new Decimal(updated?.balance ?? 0);
  }

  /**
   * Creates multiple ledger entries in bulk.
   * For entries targeting SYS_FEE_SUSPENSE, balanceAfter is stored as 0.00
   * because the suspense account balance is computed dynamically from ledger_entries SUM.
   */
  async createLedgerEntries(
    manager: EntityManager,
    entries: {
      accountId: string;
      transactionId: string | null;
      type: LedgerEntryType;
      amount: Decimal;
      balanceAfter: Decimal;
    }[]
  ): Promise<void> {
    const suspenseId = await this.getSuspenseAccountId();
    const records = entries.map(e => manager.create(LedgerEntry, {
      accountId: e.accountId,
      transactionId: e.transactionId,
      type: e.type,
      amount: e.amount.toFixed(2),
      balanceAfter: e.accountId === suspenseId ? '0.00' : e.balanceAfter.toFixed(2),
    }));
    await manager.save(LedgerEntry, records);
  }

  async createAndSaveTransaction(manager: EntityManager, data: Partial<Transaction>): Promise<Transaction> {
    const transaction = manager.create(Transaction, {
      ...data,
      status: TransactionStatus.COMPLETED,
    });
    return manager.save(Transaction, transaction);
  }

  applySearchFilter(query: SelectQueryBuilder<Transaction>, searchPattern: string) {
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

  mapToResult(
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

  /**
   * Core balance updates and ledger entries creation method.
   * Lock accounts -> Check balance/limit -> Post balance -> Write ledger -> Complete transaction.
   */
  async executeMovement(manager: EntityManager, tx: Transaction): Promise<Transaction> {
    const lockedAccounts = await this.lockAccountsForMovement(manager, tx.fromAccountId, tx.toAccountId);
    const fromAccount = tx.fromAccountId ? (lockedAccounts.get(tx.fromAccountId) ?? null) : null;
    const toAccount = tx.toAccountId ? (lockedAccounts.get(tx.toAccountId) ?? null) : null;

    const amount = new Decimal(tx.amount);
    const totalAmount = new Decimal(tx.totalAmount);
    const feeValue = new Decimal(tx.fee);

    await this.validateLimitsAndBalances(manager, tx.type, fromAccount, toAccount, amount, totalAmount);

    const balances = await this.postBalanceChanges(manager, fromAccount, toAccount, amount, feeValue);

    const ledgerEntries = await this.buildLedgerEntriesList(tx, fromAccount, toAccount, amount, feeValue, balances);
    await this.createLedgerEntries(manager, ledgerEntries);

    tx.status = TransactionStatus.COMPLETED;
    return manager.save(Transaction, tx);
  }

  /**
   * Helper to lock accounts using pessimistic write.
   */
  private async lockAccountsForMovement(
    manager: EntityManager,
    fromId?: string | null,
    toId?: string | null,
  ): Promise<Map<string, Account>> {
    const accountIdsToLock = [];
    if (fromId) accountIdsToLock.push(fromId);
    if (toId) accountIdsToLock.push(toId);

    accountIdsToLock.sort();

    const lockedAccounts = new Map<string, Account>();
    for (const id of accountIdsToLock) {
      const acc = await manager.findOne(Account, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (acc) lockedAccounts.set(id, acc);
    }
    return lockedAccounts;
  }

  /**
   * Validates account state, available balances, and daily transaction limits.
   */
  private async validateLimitsAndBalances(
    manager: EntityManager,
    type: TransactionType,
    fromAccount: Account | null,
    toAccount: Account | null,
    amount: Decimal,
    totalAmount: Decimal,
  ): Promise<void> {
    if (type === TransactionType.TRANSFER || type === TransactionType.WITHDRAW) {
      if (!fromAccount || fromAccount.status !== AccountStatus.ACTIVE) {
        throw new UnprocessableEntityException('Source account not found or is locked');
      }
      if (totalAmount.gt(fromAccount.balance)) {
        throw new UnprocessableEntityException('Số dư tài khoản không đủ');
      }

      const accWithLimit = fromAccount as { dailyLimit: string | null };
      const customLimit = accWithLimit.dailyLimit ? new Decimal(accWithLimit.dailyLimit) : null;
      const dailyLimitValue = this.systemSettingsService.getSetting<number>('daily_limit');
      const dailyLimit = customLimit ?? (dailyLimitValue !== null ? new Decimal(dailyLimitValue) : null);
      if (dailyLimit !== null) {
        const usedLimit = new Decimal(fromAccount.usedDailyLimit || 0);
        if (usedLimit.plus(amount).gt(dailyLimit)) {
          throw new BadRequestException('Bạn đã vượt quá hạn mức chuyển tiền hàng ngày');
        }
        await manager
          .createQueryBuilder()
          .update(Account)
          .set({ usedDailyLimit: () => `"used_daily_limit" + ${amount.toFixed(2)}` })
          .where('id = :id', { id: fromAccount.id })
          .execute();
      }
    }

    if (type === TransactionType.TRANSFER) {
      if (!toAccount) {
        throw new NotFoundException('Destination account not found');
      }
      if (toAccount.status !== AccountStatus.ACTIVE) {
        throw new UnprocessableEntityException('Destination account is locked');
      }
    }
  }

  /**
   * Deducts amounts from source and adds to destination account.
   */
  private async postBalanceChanges(
    manager: EntityManager,
    fromAccount: Account | null,
    toAccount: Account | null,
    amount: Decimal,
    feeValue: Decimal,
  ): Promise<{ debitAfterAmount: Decimal; debitAfterFee: Decimal; creditAfter: Decimal }> {
    let debitBalanceAfterAmount = new Decimal(0);
    let debitBalanceAfterFee = new Decimal(0);
    let creditBalanceAfter = new Decimal(0);

    if (fromAccount) {
      debitBalanceAfterAmount = await this.updateAccountBalance(manager, fromAccount.id, amount, 'subtract');
      debitBalanceAfterFee = debitBalanceAfterAmount;
      if (feeValue.gt(0)) {
        debitBalanceAfterFee = await this.updateAccountBalance(manager, fromAccount.id, feeValue, 'subtract');
      }
    }

    if (toAccount) {
      creditBalanceAfter = await this.updateAccountBalance(manager, toAccount.id, amount, 'add');
    }

    return {
      debitAfterAmount: debitBalanceAfterAmount,
      debitAfterFee: debitBalanceAfterFee,
      creditAfter: creditBalanceAfter,
    };
  }

  /**
   * Generates the double-entry bookkeeping ledger entry records.
   */
  private async buildLedgerEntriesList(
    tx: Transaction,
    fromAccount: Account | null,
    toAccount: Account | null,
    amount: Decimal,
    feeValue: Decimal,
    balances: { debitAfterAmount: Decimal; debitAfterFee: Decimal; creditAfter: Decimal },
  ): Promise<{
    accountId: string;
    transactionId: string | null;
    type: LedgerEntryType;
    amount: Decimal;
    balanceAfter: Decimal;
  }[]> {
    const ledgerEntries: {
      accountId: string;
      transactionId: string | null;
      type: LedgerEntryType;
      amount: Decimal;
      balanceAfter: Decimal;
    }[] = [];

    if (fromAccount) {
      ledgerEntries.push({
        accountId: fromAccount.id,
        transactionId: tx.id,
        type: LedgerEntryType.DEBIT,
        amount,
        balanceAfter: balances.debitAfterAmount,
      });

      if (feeValue.gt(0)) {
        const suspenseAccountId = await this.getSuspenseAccountId();
        ledgerEntries.push({
          accountId: fromAccount.id,
          transactionId: tx.id,
          type: LedgerEntryType.DEBIT,
          amount: feeValue,
          balanceAfter: balances.debitAfterFee,
        });

        ledgerEntries.push({
          accountId: suspenseAccountId,
          transactionId: tx.id,
          type: LedgerEntryType.CREDIT,
          amount: feeValue,
          balanceAfter: new Decimal(0),
        });
      }
    }

    if (toAccount) {
      ledgerEntries.push({
        accountId: toAccount.id,
        transactionId: tx.id,
        type: LedgerEntryType.CREDIT,
        amount,
        balanceAfter: balances.creditAfter,
      });
    }

    return ledgerEntries;
  }
}
