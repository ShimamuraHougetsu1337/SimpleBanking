import { Injectable, BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, SelectQueryBuilder, Brackets } from 'typeorm';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';
import { LedgerEntry, LedgerEntryType } from '../entities/ledger-entry.entity';
import Decimal from 'decimal.js';

@Injectable()
export class TransactionsHelper {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

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
   */
  async updateAccountBalance(
    manager: EntityManager,
    accountId: string,
    amount: Decimal,
    operation: 'add' | 'subtract',
  ): Promise<Decimal> {
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
   * Creates a DEBIT + CREDIT pair of ledger entries for a transfer.
   * Must be called within the same QueryRunner transaction as the balance update.
   */
  async createLedgerEntriesForTransfer(
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
   * Must be called within the same QueryRunner transaction as the balance update.
   */
  async createSingleLedgerEntry(
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
}
