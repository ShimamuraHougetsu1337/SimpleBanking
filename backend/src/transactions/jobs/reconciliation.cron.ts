import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Account } from '@/accounts/entities/account.entity';
import { LedgerService } from '../services/ledger.service';
import Decimal from 'decimal.js';

@Injectable()
export class ReconciliationCron {
  private readonly logger = new Logger(ReconciliationCron.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
  ) {}

  @Cron(process.env.RECONCILIATION_CRON || '0 * * * *')
  async handleReconciliation() {
    this.logger.log('Starting balance reconciliation process...');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    // Using REPEATABLE READ isolation level to ensure consistency across separate read queries.
    await queryRunner.startTransaction('REPEATABLE READ');

    try {
      // Fetch all accounts that are not soft-deleted
      const accounts = await queryRunner.manager.find(Account);

      let totalChecked = 0;
      let mismatchCount = 0;

      for (const account of accounts) {
        const computedBalance = await this.ledgerService.calculateBalanceFromLedger(
          queryRunner.manager,
          account.id,
        );

        const currentBalance = new Decimal(account.balance);

        if (!computedBalance.equals(currentBalance)) {
          mismatchCount++;
          this.logger.warn(
            `[Reconciliation] Balance mismatch detected on account ${account.accountNumber} (ID: ${account.id}). ` +
              `Ledger computed: ${computedBalance.toFixed(2)}, Account cached balance: ${currentBalance.toFixed(2)}. ` +
              `Difference: ${computedBalance.minus(currentBalance).toFixed(2)}`,
          );
        }
        totalChecked++;
      }

      await queryRunner.commitTransaction();

      if (mismatchCount > 0) {
        this.logger.warn(
          `Reconciliation completed. Checked ${totalChecked} accounts. Found ${mismatchCount} mismatches.`,
        );
      } else {
        this.logger.log(
          `Reconciliation completed successfully. Checked ${totalChecked} accounts. No mismatches found.`,
        );
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error occurred during reconciliation:', error);
    } finally {
      await queryRunner.release();
    }
  }
}
