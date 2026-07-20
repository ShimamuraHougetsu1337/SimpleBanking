import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { FraudFlag, FraudFlagStatus, FraudRuleName } from './entities/fraud-flag.entity';
import { Transaction } from '@/transactions/entities/transaction.entity';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';
import { User } from '@/users/entities/user.entity';
import { GetFraudFlagsQueryDto } from './dto/get-fraud-flags-query.dto';
import { ReviewFraudFlagDto } from './dto/review-fraud-flag.dto';
import Decimal from 'decimal.js';

@Injectable()
export class FraudDetectionService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(FraudFlag)
    private readonly fraudFlagRepo: Repository<FraudFlag>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  /**
   * Analyzes a newly created transaction against fraud rules and flags if suspicious.
   * Does NOT throw or block the transaction (avoids false positives).
   */
  async checkTransaction(
    manager: EntityManager,
    tx: Transaction,
    fromAccountId: string,
  ): Promise<FraudFlag[]> {
    if (!fromAccountId) return [];

    const flagsToCreate: Partial<FraudFlag>[] = [];
    const txAmount = new Decimal(tx.amount || 0);

    // Rule 1: High Frequency (> 5 transactions in last 1 minute)
    const oneMinAgo = new Date(Date.now() - 60 * 1000);
    const recentTxCount = await manager
      .createQueryBuilder(Transaction, 't')
      .where('t.from_account_id = :fromAccountId', { fromAccountId })
      .andWhere('t.created_at >= :oneMinAgo', { oneMinAgo })
      .getCount();

    if (recentTxCount >= 5) {
      flagsToCreate.push({
        transactionId: tx.id,
        accountId: fromAccountId,
        ruleName: FraudRuleName.HIGH_FREQUENCY_1MIN,
        reason: `Tài khoản phát sinh ${recentTxCount + 1} giao dịch trong vòng 1 phút qua.`,
        status: FraudFlagStatus.PENDING_REVIEW,
      });
    }

    // Rule 2: High Value Spike (> 5x 30-day average transaction amount)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const avgResult = await manager
      .createQueryBuilder(Transaction, 't')
      .select('COUNT(t.id)', 'txCount')
      .addSelect('AVG(CAST(t.amount AS NUMERIC))', 'avgAmount')
      .where('t.from_account_id = :fromAccountId', { fromAccountId })
      .andWhere('t.created_at >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('t.id != :currentTxId', { currentTxId: tx.id })
      .getRawOne<{ avgAmount: string | null; txCount: string }>();

    const pastCount = parseInt(avgResult?.txCount || '0', 10);
    const avgAmountVal = parseFloat(avgResult?.avgAmount || '0');

    if (pastCount >= 2 && avgAmountVal > 0) {
      const avgDecimal = new Decimal(avgAmountVal);
      if (txAmount.gte(avgDecimal.mul(5))) {
        flagsToCreate.push({
          transactionId: tx.id,
          accountId: fromAccountId,
          ruleName: FraudRuleName.HIGH_VALUE_SPIKE_30D,
          reason: `Số tiền giao dịch (${txAmount.toFixed(0)} VND) gấp hơn 5 lần trung bình 30 ngày qua (${avgDecimal.toFixed(0)} VND).`,
          status: FraudFlagStatus.PENDING_REVIEW,
        });
      }
    }

    const createdFlags: FraudFlag[] = [];
    for (const flagData of flagsToCreate) {
      const flag = manager.create(FraudFlag, flagData);
      createdFlags.push(await manager.save(FraudFlag, flag));
    }

    return createdFlags;
  }

  async getFraudFlags(query: GetFraudFlagsQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const qb = this.fraudFlagRepo
      .createQueryBuilder('ff')
      .leftJoin('ff.transaction', 't')
      .addSelect(['t.id', 't.amount', 't.type', 't.status'])
      .leftJoin('ff.account', 'a')
      .addSelect(['a.id', 'a.accountNumber', 'a.status'])
      .leftJoin('ff.reviewedBy', 'u')
      .addSelect(['u.id', 'u.fullName', 'u.email'])
      .orderBy('ff.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('ff.status = :status', { status: query.status });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reviewFraudFlag(id: string, dto: ReviewFraudFlagDto, adminUser: User): Promise<FraudFlag> {
    const flag = await this.fraudFlagRepo.findOne({
      where: { id },
      relations: { account: true },
    });

    if (!flag) {
      throw new NotFoundException(`Không tìm thấy bản ghi cảnh báo với ID "${id}"`);
    }

    if (flag.status !== FraudFlagStatus.PENDING_REVIEW) {
      throw new BadRequestException('Cảnh báo này đã được xem xét xử lý trước đó.');
    }

    flag.status = dto.status;
    flag.reviewNote = dto.reviewNote || null;
    flag.reviewedById = adminUser.id;
    flag.reviewedAt = new Date();

    if (dto.lockAccount && flag.account) {
      await this.accountRepo.update(flag.accountId, { status: AccountStatus.LOCKED });
    }

    return this.fraudFlagRepo.save(flag);
  }
}
