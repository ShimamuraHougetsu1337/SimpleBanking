import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { AuditLogsModule } from '@/audit-logs/audit-logs.module';
import { FeeSettlementCron } from './jobs/fee-settlement.cron';
import { LedgerService } from './services/ledger.service';
import { TransactionRequest } from './entities/transaction-request.entity';
import { TransactionRateLimitGuard } from './guards/transaction-rate-limit.guard';
import { OtpService } from './services/otp.service';
import { SystemSettingsModule } from '@/system-settings/system-settings.module';
import { Account } from '@/accounts/entities/account.entity';
import { User } from '@/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionRequest, LedgerEntry, FeeSettlementLog, Account, User]),
    AccountsModule,
    AuditLogsModule,
    ThrottlerModule,
    SystemSettingsModule,
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
    TransactionRateLimitGuard,
    OtpService,
  ],
  exports: [TransactionsService, TransactionRequestsService, LedgerService, TransactionRateLimitGuard, OtpService],
})
export class TransactionsModule { }
