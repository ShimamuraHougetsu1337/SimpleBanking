import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsController } from './controllers/transactions.controller';
import { TransactionsService } from './services/transactions.service';
import { TransactionRequestsService } from './services/transaction-requests.service';
import { FeesService } from './services/fees.service';
import { TransactionsHelper } from './helpers/transactions.helper';
import { Transaction } from './entities/transaction.entity';
import { FeeLedger } from './entities/fee-ledger.entity';
import { FeeSettlementLog } from './entities/fee-settlement-log.entity';
import { AccountsModule } from '@/accounts/accounts.module';
import { BullModule } from '@nestjs/bullmq';

import { FeeQueueProcessor } from './jobs/fee-queue.processor';
import { FeeSettlementCron } from './jobs/fee-settlement.cron';

import { TransactionRequest } from './entities/transaction-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionRequest, FeeLedger, FeeSettlementLog]),
    BullModule.registerQueue({
      name: 'fee_queue',
    }),
    AccountsModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService, 
    TransactionRequestsService, 
    FeesService, 
    TransactionsHelper, 
    FeeQueueProcessor, 
    FeeSettlementCron
  ],
  exports: [TransactionsService, TransactionRequestsService],
})
export class TransactionsModule {}
