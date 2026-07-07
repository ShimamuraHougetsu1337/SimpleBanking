import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsHelper } from './transactions.helper';
import { Transaction } from './entities/transaction.entity';
import { FeeLedger } from './entities/fee-ledger.entity';
import { FeeSettlementLog } from './entities/fee-settlement-log.entity';
import { AccountsModule } from '@/accounts/accounts.module';
import { BullModule } from '@nestjs/bullmq';

import { FeeQueueProcessor } from './fee-queue.processor';
import { FeeSettlementCron } from './fee-settlement.cron';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, FeeLedger, FeeSettlementLog]),
    BullModule.registerQueue({
      name: 'fee_queue',
    }),
    AccountsModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsHelper, FeeQueueProcessor, FeeSettlementCron],
  exports: [TransactionsService],
})
export class TransactionsModule {}
