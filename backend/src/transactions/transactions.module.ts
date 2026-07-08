import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsController } from './controllers/transactions.controller';
import { ReversalController } from './controllers/reversal.controller';
import { TransactionsService } from './services/transactions.service';
import { TransactionRequestsService } from './services/transaction-requests.service';
import { FeesService } from './services/fees.service';
import { ReversalService } from './services/reversal.service';
import { TransactionsHelper } from './helpers/transactions.helper';
import { Transaction } from './entities/transaction.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { FeeSettlementLog } from './entities/fee-settlement-log.entity';
import { AccountsModule } from '@/accounts/accounts.module';
import { FeeSettlementCron } from './jobs/fee-settlement.cron';
import { LedgerService } from './services/ledger.service';
import { TransactionRequest } from './entities/transaction-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionRequest, LedgerEntry, FeeSettlementLog]),
    AccountsModule,
  ],
  controllers: [TransactionsController, ReversalController],
  providers: [
    TransactionsService,
    TransactionRequestsService,
    FeesService,
    TransactionsHelper,
    LedgerService,
    ReversalService,
    FeeSettlementCron,
  ],
  exports: [TransactionsService, TransactionRequestsService, LedgerService],
})
export class TransactionsModule { }
