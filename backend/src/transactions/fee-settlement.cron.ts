import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FeeLedger, FeeLedgerType } from './entities/fee-ledger.entity';
import { Account } from '@/accounts/entities/account.entity';
import { UserRole } from '@/users/entities/user.entity';
import { FeeSettlementLog } from './entities/fee-settlement-log.entity';
import Decimal from 'decimal.js';

@Injectable()
export class FeeSettlementCron {
  private readonly logger = new Logger(FeeSettlementCron.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) { }

  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  @Cron(CronExpression.EVERY_HOUR)
  async handleFeeSettlement() {
    this.logger.log('Starting daily fee settlement process...');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const currentTime = new Date();

      // Lấy mốc thời gian chốt sổ gần nhất từ log
      const lastLog = await queryRunner.manager
        .createQueryBuilder(FeeSettlementLog, 'log')
        .orderBy('log.createdAt', 'DESC')
        .getOne();

      const lastSettledTime = lastLog ? lastLog.createdAt : new Date(0);

      // 1. Chỉ tính tổng phí của các giao dịch MỚI (sau mốc thời gian trên)
      const creditResult = await queryRunner.manager
        .createQueryBuilder(FeeLedger, 'fee')
        .select('SUM(CAST(fee.amount AS NUMERIC))', 'totalCredit')
        .where('fee.type = :type', { type: FeeLedgerType.CREDIT })
        .andWhere('fee.createdAt > :lastTime', { lastTime: lastSettledTime })
        .andWhere('fee.createdAt <= :currentTime', { currentTime })
        .getRawOne<{ totalCredit: string | null }>();

      const { totalCredit } = creditResult || { totalCredit: '0' };
      const pendingAmount = new Decimal(totalCredit || 0);

      const updateWatermark = async () => {
        // Insert bản ghi log mới để tạo mốc thời gian chốt sổ tiếp theo
        const newLog = queryRunner.manager.create(FeeSettlementLog, {
          amount: pendingAmount.toFixed(2),
          createdAt: currentTime,
        });
        await queryRunner.manager.save(FeeSettlementLog, newLog);
      };

      if (pendingAmount.lte(0)) {
        this.logger.log('No new fees to settle. Updating watermark and completing.');
        await updateWatermark();
        await queryRunner.commitTransaction();
        return;
      }

      this.logger.log(`Found ${pendingAmount.toFixed(2)} in new unsettled fees. Processing payout...`);

      // 2. Tìm và khóa tài khoản Admin
      const adminAccountRef = await queryRunner.manager
        .createQueryBuilder(Account, 'account')
        .innerJoin('account.user', 'user')
        .where('user.role = :role', { role: UserRole.ADMIN })
        .getOne();

      if (!adminAccountRef) {
        throw new Error('Admin account not found for fee settlement');
      }

      const adminAccount = await queryRunner.manager.findOne(Account, {
        where: { id: adminAccountRef.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!adminAccount) {
        throw new Error('Could not lock admin account');
      }

      // 3. Cộng tiền vào tài khoản Admin
      await queryRunner.manager
        .createQueryBuilder()
        .update(Account)
        .set({ balance: () => `balance + ${pendingAmount.toFixed(2)}` })
        .where('id = :id', { id: adminAccount.id })
        .execute();

      // 4. Tạo bút toán Debit vào FeeLedger để cấn trừ và ghi log
      const settlementRecord = queryRunner.manager.create(FeeLedger, {
        amount: pendingAmount.toFixed(2),
        type: FeeLedgerType.DEBIT,
        description: 'Daily Fee Settlement to Admin',
      });
      await queryRunner.manager.save(FeeLedger, settlementRecord);

      // 5. Cập nhật lại mốc thời gian chốt sổ
      await updateWatermark();

      await queryRunner.commitTransaction();
      this.logger.log(`Successfully settled ${pendingAmount.toFixed(2)} to admin account.`);

    } catch (error) {
      this.logger.error('Failed to process fee settlement', error);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}
