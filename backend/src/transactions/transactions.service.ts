import { Injectable, BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Brackets, Repository, DataSource, QueryRunner } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';
import { TransferDto } from './dto/transfer.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import Decimal from 'decimal.js';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) { }

  async getTransactionsForUser(
    userId: string,
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
        new Brackets((qb) => {
          qb.where('fromAccount.userId = :userId', { userId })
            .orWhere('toAccount.userId = :userId', { userId });
        })
      );

    if (accountId) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('tx.fromAccountId = :accountId', { accountId })
            .orWhere('tx.toAccountId = :accountId', { accountId });
        })
      );
    }

    if (filter?.search) {
      query.andWhere('tx.description ILIKE :search', { search: `%${filter.search}%` });
    }

    if (filter?.fromDate) {
      query.andWhere('tx.createdAt >= :fromDate', { fromDate: filter.fromDate });
    }

    if (filter?.toDate) {
      // Adding 1 day to include the end date fully if it's just a date string
      const toDate = new Date(filter.toDate);
      toDate.setUTCHours(23, 59, 59, 999);
      query.andWhere('tx.createdAt <= :toDate', { toDate });
    }

    const transactions = await query
      .orderBy('tx.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return transactions.flatMap((tx) => {
      if (accountId) {
        if (tx.fromAccountId === accountId) {
          return this.mapToResult(tx, 'debit', tx.toAccount);
        }
        if (tx.toAccountId === accountId) {
          return this.mapToResult(tx, 'credit', tx.fromAccount);
        }
        return [];
      }

      const isFromUser = tx.fromAccount?.userId === userId;
      const isToUser = tx.toAccount?.userId === userId;

      if (isFromUser && isToUser) {
        return [
          this.mapToResult(tx, 'debit', tx.toAccount, 'debit'),
          this.mapToResult(tx, 'credit', tx.fromAccount, 'credit'),
        ];
      }
      if (isFromUser) {
        return this.mapToResult(tx, 'debit', tx.toAccount);
      }
      if (isToUser) {
        return this.mapToResult(tx, 'credit', tx.fromAccount);
      }
      return [];
    });
  }

  async transfer(dto: TransferDto, currentUserId: string): Promise<Transaction> {
    const existing = await this.dataSource
      .getRepository(Transaction)
      .findOne({ where: { idempotencyKey: dto.idempotencyKey } });

    if (existing) {
      return existing;
    }

    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fromAccount = await queryRunner.manager.findOne(Account, {
        where: { id: dto.from_accountId, userId: currentUserId, status: AccountStatus.ACTIVE },
        lock: { mode: 'pessimistic_write' },
      });

      if (!fromAccount) {
        throw new NotFoundException('Source account not found or is locked');
      }

      const toAccount = await queryRunner.manager.findOne(Account, {
        where: { accountNumber: dto.to_accountNumber },
        lock: { mode: 'pessimistic_write' },
      });

      if (!toAccount) {
        throw new NotFoundException('Destination account does not exist');
      }
      if (fromAccount.id === toAccount.id) {
        throw new BadRequestException('Cannot transfer to the same account');
      }
      if (toAccount.status !== AccountStatus.ACTIVE) {
        throw new UnprocessableEntityException('Destination account is locked');
      }

      const amount = new Decimal(dto.amount);
      const balance = new Decimal(fromAccount.balance);
      if (amount.gt(balance)) {
        throw new UnprocessableEntityException('Insufficient balance');
      }
      if (amount.lte(0)) {
        throw new BadRequestException('Transfer amount must be greater than 0');
      }
      if (amount.decimalPlaces() > 2) {
        throw new BadRequestException('Amount has a maximum of 2 decimal places');
      }

      await queryRunner.manager
        .createQueryBuilder()
        .update(Account)
        .set({ balance: () => `balance - ${amount.toFixed(2)}` })
        .where('id = :id', { id: fromAccount.id })
        .execute();

      await queryRunner.manager
        .createQueryBuilder()
        .update(Account)
        .set({ balance: () => `balance + ${amount.toFixed(2)}` })
        .where('id = :id', { id: toAccount.id })
        .execute();

      const transaction = queryRunner.manager.create(Transaction, {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: dto.amount,
        description: dto.description,
        idempotencyKey: dto.idempotencyKey,
        status: TransactionStatus.SUCCESS,
        type: TransactionType.TRANSFER,
      });
      await queryRunner.manager.save(Transaction, transaction);

      await queryRunner.commitTransaction();
      return transaction;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;

    } finally {
      await queryRunner.release();
    }
  }
  async deposit(dto: DepositDto, currentUserId: string): Promise<Transaction> {
    const existing = await this.dataSource
      .getRepository(Transaction)
      .findOne({ where: { idempotencyKey: dto.idempotencyKey } });

    if (existing) {
      return existing;
    }

    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const account = await queryRunner.manager.findOne(Account, {
        where: { id: dto.accountId, userId: currentUserId, status: AccountStatus.ACTIVE },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account) {
        throw new NotFoundException('Account not found or is locked');
      }

      const amount = new Decimal(dto.amount);
      if (amount.lte(0)) {
        throw new BadRequestException('Deposit amount must be greater than 0');
      }
      if (amount.decimalPlaces() > 2) {
        throw new BadRequestException('Amount has a maximum of 2 decimal places');
      }

      await queryRunner.manager
        .createQueryBuilder()
        .update(Account)
        .set({ balance: () => `balance + ${amount.toFixed(2)}` })
        .where('id = :id', { id: account.id })
        .execute();

      const transaction = queryRunner.manager.create(Transaction, {
        toAccountId: account.id,
        amount: dto.amount.toString(), // Entity amount is a string (numeric)
        description: dto.description || 'Deposit',
        idempotencyKey: dto.idempotencyKey,
        status: TransactionStatus.SUCCESS,
        type: TransactionType.DEPOSIT,
      });
      await queryRunner.manager.save(Transaction, transaction);

      await queryRunner.commitTransaction();
      return transaction;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async withdraw(dto: WithdrawDto, currentUserId: string): Promise<Transaction> {
    const existing = await this.dataSource
      .getRepository(Transaction)
      .findOne({ where: { idempotencyKey: dto.idempotencyKey } });

    if (existing) {
      return existing;
    }

    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const account = await queryRunner.manager.findOne(Account, {
        where: { id: dto.accountId, userId: currentUserId, status: AccountStatus.ACTIVE },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account) {
        throw new NotFoundException('Account not found or is locked');
      }

      const amount = new Decimal(dto.amount);
      const balance = new Decimal(account.balance);
      if (amount.gt(balance)) {
        throw new UnprocessableEntityException('Insufficient balance');
      }
      if (amount.lte(0)) {
        throw new BadRequestException('Withdraw amount must be greater than 0');
      }
      if (amount.decimalPlaces() > 2) {
        throw new BadRequestException('Amount has a maximum of 2 decimal places');
      }

      await queryRunner.manager
        .createQueryBuilder()
        .update(Account)
        .set({ balance: () => `balance - ${amount.toFixed(2)}` })
        .where('id = :id', { id: account.id })
        .execute();

      const transaction = queryRunner.manager.create(Transaction, {
        fromAccountId: account.id,
        amount: dto.amount.toString(),
        description: dto.description || 'Withdraw',
        idempotencyKey: dto.idempotencyKey,
        status: TransactionStatus.SUCCESS,
        type: TransactionType.WITHDRAW,
      });
      await queryRunner.manager.save(Transaction, transaction);

      await queryRunner.commitTransaction();
      return transaction;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private mapToResult(
    tx: Transaction,
    direction: 'credit' | 'debit',
    counterpartAccount: Account | null | undefined,
    suffix?: string,
  ) {
    const defaultName = direction === 'credit' ? 'System Deposit' : 'Unknown';
    const counterpartName =
      counterpartAccount?.user?.fullName || counterpartAccount?.name || defaultName;

    return {
      id: suffix ? `${tx.id}-${suffix}` : tx.id,
      type: tx.type,
      direction,
      amount: tx.amount,
      counterpartAccount: counterpartAccount?.accountNumber,
      counterpartName,
      description: tx.description,
      status: tx.status,
      createdAt: tx.createdAt,
    };
  }
}
