import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Account } from '@/accounts/entities/account.entity';
import { LedgerService } from '../services/ledger.service';
import { LedgerEntry, LedgerEntryType } from '../entities/ledger-entry.entity';
import { ReconciliationReport, ReconciliationStatus, MismatchDetail } from '../entities/reconciliation-report.entity';
import { FeeSettlementCron } from './fee-settlement.cron';
import { SystemAccount } from '@/common/enums/system-account.enum';
import Decimal from 'decimal.js';

@Injectable()
export class ReconciliationCron {
  private readonly logger = new Logger(ReconciliationCron.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
    private readonly feeSettlementCron: FeeSettlementCron,
  ) { }

  @Cron(process.env.RECONCILIATION_CRON || '0 59 23 * * *')
  async handleReconciliation() {
    this.logger.log('Triggering scheduled daily reconciliation...');
    try {
      const report = await this.runReconciliation();
      this.logger.log(
        `Scheduled reconciliation finished. Status: ${report.status}, Mismatches: ${report.mismatchCount}`,
      );
    } catch (error) {
      this.logger.error('Failed to run scheduled reconciliation:', error);
    }
  }

  async runReconciliation(): Promise<ReconciliationReport> {
    this.logger.log('Starting balance reconciliation process...');
    
    await this.runPreReconciliationSweep();

    const checkedAt = new Date();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    // Using REPEATABLE READ isolation level to ensure consistency across separate read queries.
    await queryRunner.startTransaction('REPEATABLE READ');

    try {
      const accounts = await queryRunner.manager.find(Account);
      const mismatches: MismatchDetail[] = [];

      // 1. Get watermark and accumulated values from the last report
      const lastReport = await this.getLastReport(queryRunner.manager);
      const lastWatermarkTime = lastReport ? lastReport.checkedAt : new Date(0);
      const prevDebit = new Decimal(lastReport ? lastReport.accumulatedDebit : 0);
      const prevCredit = new Decimal(lastReport ? lastReport.accumulatedCredit : 0);

      // 2. Query delta of debits and credits and compute accumulated values
      const { deltaDebit, deltaCredit } = await this.getLedgerDelta(
        queryRunner.manager,
        lastWatermarkTime,
        checkedAt,
      );
      const accumulatedDebit = prevDebit.plus(deltaDebit);
      const accumulatedCredit = prevCredit.plus(deltaCredit);

      // 3. Verify Global Trial Balance
      this.verifyGlobalTrialBalance(accumulatedDebit, accumulatedCredit, mismatches);

      // 4. Reconcile and auto-heal individual accounts
      const totalChecked = await this.reconcileAccounts(queryRunner.manager, accounts, mismatches);

      // 5. Save the report
      const savedReport = await this.saveReport(
        queryRunner.manager,
        checkedAt,
        totalChecked,
        accumulatedDebit,
        accumulatedCredit,
        mismatches,
      );

      await queryRunner.commitTransaction();
      this.logCompletion(savedReport, totalChecked, mismatches.length);
      return savedReport;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error occurred during reconciliation:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async runPreReconciliationSweep(): Promise<void> {
    try {
      this.logger.log('[Reconciliation] Running pre-reconciliation fee settlement sweep...');
      await this.feeSettlementCron.handleFeeSettlement();

      this.logger.log('[Reconciliation] Synchronizing system accounts before audit...');
      await this.syncSystemAccounts();
    } catch (err) {
      this.logger.error('Failed to run pre-reconciliation sweep', err);
      throw err;
    }
  }

  private async syncSystemAccounts(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const systemAccounts = await queryRunner.manager.find(Account, {
        where: [
          { accountNumber: SystemAccount.CASH_VAULT },
          { accountNumber: SystemAccount.FEE_SUSPENSE },
        ],
        lock: { mode: 'pessimistic_write' },
      });

      for (const account of systemAccounts) {
        let computedBalance: Decimal;
        if (account.accountNumber === (SystemAccount.CASH_VAULT as string)) {
          computedBalance = await this.ledgerService.calculateAssetBalanceFromLedger(queryRunner.manager, account.id);
        } else {
          computedBalance = await this.ledgerService.calculateLiabilityBalanceFromLedger(queryRunner.manager, account.id);
        }

        account.balance = computedBalance.toFixed(2);
        await queryRunner.manager.save(Account, account);
      }

      await queryRunner.commitTransaction();
      this.logger.log('[Reconciliation] System accounts synchronized successfully.');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to synchronize system accounts:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async getLastReport(manager: EntityManager): Promise<ReconciliationReport | null> {
    return await manager.findOne(ReconciliationReport, {
      where: {},
      order: { checkedAt: 'DESC' },
    });
  }

  private async getLedgerDelta(
    manager: EntityManager,
    lastWatermarkTime: Date,
    checkedAt: Date,
  ): Promise<{ deltaDebit: Decimal; deltaCredit: Decimal }> {
    const deltaDebitResult = await manager
      .createQueryBuilder(LedgerEntry, 'le')
      .select('SUM(CAST(le.amount AS NUMERIC))', 'totalDebit')
      .where('le.type = :type', { type: LedgerEntryType.DEBIT })
      .andWhere('le.createdAt > :lastTime', { lastTime: lastWatermarkTime })
      .andWhere('le.createdAt <= :currentTime', { currentTime: checkedAt })
      .getRawOne<{ totalDebit: string | null }>();

    const deltaCreditResult = await manager
      .createQueryBuilder(LedgerEntry, 'le')
      .select('SUM(CAST(le.amount AS NUMERIC))', 'totalCredit')
      .where('le.type = :type', { type: LedgerEntryType.CREDIT })
      .andWhere('le.createdAt > :lastTime', { lastTime: lastWatermarkTime })
      .andWhere('le.createdAt <= :currentTime', { currentTime: checkedAt })
      .getRawOne<{ totalCredit: string | null }>();

    return {
      deltaDebit: new Decimal(deltaDebitResult?.totalDebit || 0),
      deltaCredit: new Decimal(deltaCreditResult?.totalCredit || 0),
    };
  }

  private verifyGlobalTrialBalance(
    accumulatedDebit: Decimal,
    accumulatedCredit: Decimal,
    mismatches: MismatchDetail[],
  ): void {
    if (!accumulatedDebit.equals(accumulatedCredit)) {
      const difference = accumulatedDebit.minus(accumulatedCredit);
      mismatches.push({
        accountId: 'SYSTEM_GLOBAL',
        accountNumber: 'ALL_ACCOUNTS_TRIAL_BALANCE',
        cachedBalance: accumulatedDebit.toFixed(2),
        computedBalance: accumulatedCredit.toFixed(2),
        difference: difference.toFixed(2),
      });

      this.logger.error(
        `[Reconciliation] Global Trial Balance mismatch! ` +
        `Accumulated Debits: ${accumulatedDebit.toFixed(2)}, Accumulated Credits: ${accumulatedCredit.toFixed(2)}. ` +
        `Difference: ${difference.toFixed(2)}`
      );
    }
  }

  private async reconcileAccounts(
    manager: EntityManager,
    accounts: Account[],
    mismatches: MismatchDetail[],
  ): Promise<number> {
    let totalChecked = 0;
    for (const account of accounts) {
      let computedBalance: Decimal;
      if (account.accountNumber === (SystemAccount.CASH_VAULT as string)) {
        computedBalance = await this.ledgerService.calculateAssetBalanceFromLedger(manager, account.id);
      } else {
        computedBalance = await this.ledgerService.calculateLiabilityBalanceFromLedger(manager, account.id);
      }

      const currentBalance = new Decimal(account.balance);

      if (!computedBalance.equals(currentBalance)) {
        const difference = computedBalance.minus(currentBalance);
        mismatches.push({
          accountId: account.id,
          accountNumber: account.accountNumber,
          cachedBalance: currentBalance.toFixed(2),
          computedBalance: computedBalance.toFixed(2),
          difference: difference.toFixed(2),
        });

        this.logger.error(
          `[Reconciliation] Balance mismatch detected on account ${account.accountNumber} (ID: ${account.id}). ` +
          `Ledger computed: ${computedBalance.toFixed(2)}, Account cached balance: ${currentBalance.toFixed(2)}. ` +
          `Difference: ${difference.toFixed(2)}. Auto-healing cached balance...`,
        );

        // Auto-heal the cached balance in the database
        account.balance = computedBalance.toFixed(2);
        await manager.save(Account, account);
      }
      totalChecked++;
    }
    return totalChecked;
  }

  private async saveReport(
    manager: EntityManager,
    checkedAt: Date,
    totalAccounts: number,
    accumulatedDebit: Decimal,
    accumulatedCredit: Decimal,
    mismatches: MismatchDetail[],
  ): Promise<ReconciliationReport> {
    const reportStatus = mismatches.length > 0 ? ReconciliationStatus.MISMATCH : ReconciliationStatus.OK;
    const report = manager.create(ReconciliationReport, {
      checkedAt,
      status: reportStatus,
      totalAccounts,
      mismatchCount: mismatches.length,
      accumulatedDebit: accumulatedDebit.toFixed(2),
      accumulatedCredit: accumulatedCredit.toFixed(2),
      details: mismatches.length > 0 ? mismatches : null,
    });
    return await manager.save(ReconciliationReport, report);
  }

  private logCompletion(report: ReconciliationReport, totalChecked: number, mismatchCount: number): void {
    if (mismatchCount > 0) {
      this.logger.error(
        `Reconciliation completed with discrepancies. Checked ${totalChecked} accounts. Found ${mismatchCount} mismatches. Report ID: ${report.id}`,
      );
    } else {
      this.logger.log(
        `Reconciliation completed successfully. Checked ${totalChecked} accounts. No mismatches found. Report ID: ${report.id}`,
      );
    }
  }

  async getReports(page: number = 1, limit: number = 10) {
    const repository = this.dataSource.getRepository(ReconciliationReport);
    const [data, total] = await repository.findAndCount({
      order: { checkedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
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
}


