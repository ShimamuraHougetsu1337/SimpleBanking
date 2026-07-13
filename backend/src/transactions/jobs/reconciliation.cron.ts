import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Account } from '@/accounts/entities/account.entity';
import { LedgerService } from '../services/ledger.service';
import { ReconciliationReport, ReconciliationStatus, MismatchDetail } from '../entities/reconciliation-report.entity';
import Decimal from 'decimal.js';

@Injectable()
export class ReconciliationCron {
  private readonly logger = new Logger(ReconciliationCron.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
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
    const checkedAt = new Date();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    // Using REPEATABLE READ isolation level to ensure consistency across separate read queries.
    await queryRunner.startTransaction('REPEATABLE READ');

    try {
      // Fetch all accounts that are not soft-deleted
      const accounts = await queryRunner.manager.find(Account);

      let totalChecked = 0;
      let mismatchCount = 0;
      const mismatches: MismatchDetail[] = [];

      for (const account of accounts) {
        const computedBalance = await this.ledgerService.calculateBalanceFromLedger(
          queryRunner.manager,
          account.id,
        );

        const currentBalance = new Decimal(account.balance);

        if (!computedBalance.equals(currentBalance)) {
          mismatchCount++;
          const difference = computedBalance.minus(currentBalance);
          const detail: MismatchDetail = {
            accountId: account.id,
            accountNumber: account.accountNumber,
            cachedBalance: currentBalance.toFixed(2),
            computedBalance: computedBalance.toFixed(2),
            difference: difference.toFixed(2),
          };
          mismatches.push(detail);

          this.logger.error(
            `[Reconciliation] Balance mismatch detected on account ${account.accountNumber} (ID: ${account.id}). ` +
            `Ledger computed: ${computedBalance.toFixed(2)}, Account cached balance: ${currentBalance.toFixed(2)}. ` +
            `Difference: ${difference.toFixed(2)}`,
          );
        }
        totalChecked++;
      }

      const reportStatus = mismatchCount > 0 ? ReconciliationStatus.MISMATCH : ReconciliationStatus.OK;

      const report = queryRunner.manager.create(ReconciliationReport, {
        checkedAt,
        status: reportStatus,
        totalAccounts: totalChecked,
        mismatchCount,
        details: mismatchCount > 0 ? mismatches : null,
      });

      const savedReport = await queryRunner.manager.save(ReconciliationReport, report);

      await queryRunner.commitTransaction();

      if (mismatchCount > 0) {
        this.logger.error(
          `Reconciliation completed with discrepancies. Checked ${totalChecked} accounts. Found ${mismatchCount} mismatches. Report ID: ${savedReport.id}`,
        );
      } else {
        this.logger.log(
          `Reconciliation completed successfully. Checked ${totalChecked} accounts. No mismatches found. Report ID: ${savedReport.id}`,
        );
      }

      return savedReport;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error occurred during reconciliation:', error);
      throw error;
    } finally {
      await queryRunner.release();
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


