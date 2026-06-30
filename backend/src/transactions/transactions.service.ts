import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

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

    return transactions.map((tx) => {
      let direction = 'debit';
      let counterpartName = 'System';
      
      // Determine direction and counterpart based on which account belongs to the user
      if (tx.fromAccount?.userId === userId) {
        direction = 'debit';
        counterpartName = tx.toAccount?.user?.fullName || tx.toAccount?.name || tx.toAccountId || 'Unknown';
      } else if (tx.toAccount?.userId === userId) {
        direction = 'credit';
        counterpartName = tx.fromAccount?.user?.fullName || tx.fromAccount?.name || tx.fromAccountId || 'System Deposit';
      }

      return {
        id: tx.id,
        type: tx.type,
        direction,
        amount: tx.amount,
        counterpartAccount: direction === 'debit' ? tx.toAccount?.accountNumber : tx.fromAccount?.accountNumber,
        counterpartName,
        description: tx.description,
        status: tx.status,
        createdAt: tx.createdAt,
      };
    });
  }
}
