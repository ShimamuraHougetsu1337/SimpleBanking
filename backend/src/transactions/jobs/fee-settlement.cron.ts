import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Account } from '@/accounts/entities/account.entity';
import { FeeSettlementLog } from '../entities/fee-settlement-log.entity';
import { LedgerEntry, LedgerEntryType } from '../entities/ledger-entry.entity';
import { TransactionsHelper } from '../helpers/transactions.helper';
import { SystemAccount } from '@/common/enums/system-account.enum';
import Decimal from 'decimal.js';

@Injectable()
export class FeeSettlementCron {
  private readonly logger = new Logger(FeeSettlementCron.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly transactionsHelper: TransactionsHelper,
  ) { }

  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  @Cron(CronExpression.EVERY_MINUTE)
  async handleFeeSettlement() {
    this.logger.log('Starting fee settlement process...');

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

      // 1. Lấy ID của tài khoản SYS_FEE_SUSPENSE
      const suspenseAccountId = await this.transactionsHelper.getSuspenseAccountId();

      // 2. Tính tổng phí thu được từ ledger_entries của Suspense Account
      //    (chỉ tính các CREDIT entries mới kể từ mốc thời gian trước)
      const creditResult = await queryRunner.manager
        .createQueryBuilder(LedgerEntry, 'entry')
        .select('SUM(CAST(entry.amount AS NUMERIC))', 'totalCredit')
        .where('entry.accountId = :suspenseAccountId', { suspenseAccountId })
        .andWhere('entry.type = :type', { type: LedgerEntryType.CREDIT })
        .andWhere('entry.createdAt > :lastTime', { lastTime: lastSettledTime })
        .andWhere('entry.createdAt <= :currentTime', { currentTime })
        .getRawOne<{ totalCredit: string | null }>();

      const { totalCredit } = creditResult || { totalCredit: '0' };
      const pendingAmount = new Decimal(totalCredit || 0);

      const updateWatermark = async () => {
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

      // 3. Tìm và khóa tài khoản doanh thu hệ thống (SYS_REVENUE)
      const revenueAccount = await queryRunner.manager.findOne(Account, {
        where: { accountNumber: SystemAccount.REVENUE as string },
        lock: { mode: 'pessimistic_write' },
      });

      if (!revenueAccount) {
        throw new Error('SYS_REVENUE system account not found for fee settlement');
      }

      // 4. Ghi Nợ (DEBIT) vào Suspense Account — cấn trừ số tiền đã gom
      //    (INSERT-only, không update balance của Suspense Account)
      const suspenseDebitEntry = queryRunner.manager.create(LedgerEntry, {
        accountId: suspenseAccountId,
        transactionId: null, // Đây là lệnh nội bộ cuối ngày, không liên kết với 1 giao dịch cụ thể
        type: LedgerEntryType.DEBIT,
        amount: pendingAmount.toFixed(2),
        balanceAfter: '0.00', // Sentinel value cho Suspense Account
      });
      await queryRunner.manager.save(LedgerEntry, suspenseDebitEntry);

      // 5. Cộng tiền thực vào tài khoản doanh thu hệ thống (SYS_REVENUE)
      await queryRunner.manager
        .createQueryBuilder()
        .update(Account)
        .set({ balance: () => `balance + ${pendingAmount.toFixed(2)}` })
        .where('id = :id', { id: revenueAccount.id })
        .execute();

      const updatedRevenue = await queryRunner.manager.findOne(Account, { where: { id: revenueAccount.id } });
      const revenueBalanceAfter = new Decimal(updatedRevenue?.balance ?? 0);

      // 6. Ghi Có (CREDIT) vào Sổ cái (ledger_entries) của tài khoản SYS_REVENUE
      const revenueCreditEntry = queryRunner.manager.create(LedgerEntry, {
        accountId: revenueAccount.id,
        transactionId: null, // Lệnh quyết toán nội bộ
        type: LedgerEntryType.CREDIT,
        amount: pendingAmount.toFixed(2),
        balanceAfter: revenueBalanceAfter.toFixed(2),
      });
      await queryRunner.manager.save(LedgerEntry, revenueCreditEntry);

      // 7. Cập nhật lại mốc thời gian chốt sổ
      await updateWatermark();

      await queryRunner.commitTransaction();
      this.logger.log(`Successfully settled ${pendingAmount.toFixed(2)} to system revenue account.`);

    } catch (error) {
      this.logger.error('Failed to process fee settlement', error);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}
