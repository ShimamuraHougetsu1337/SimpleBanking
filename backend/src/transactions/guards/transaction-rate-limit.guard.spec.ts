import { Controller, Get, UseGuards, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import type { ThrottlerModuleOptions, ThrottlerOptions } from '@nestjs/throttler';
import { TransactionRateLimitGuard } from './transaction-rate-limit.guard';
import { CustomerAuditLogsService } from '@/audit-logs/customer-audit-logs.service';
import { CustomerAuditLog } from '@/audit-logs/entities/customer-audit-log.entity';
import { User } from '@/users/entities/user.entity';
import { Account } from '@/accounts/entities/account.entity';
import { Transaction } from '@/transactions/entities/transaction.entity';
import { LedgerEntry } from '@/transactions/entities/ledger-entry.entity';
import { SystemSetting } from '@/system-settings/entities/system-setting.entity';
import { RefreshToken } from '@/auth/entities/refresh-token.entity';
import { FeeSettlementLog } from '@/transactions/entities/fee-settlement-log.entity';
import { TransactionRequest } from '@/transactions/entities/transaction-request.entity';
import { ReconciliationReport } from '@/transactions/entities/reconciliation-report.entity';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import * as dotenv from 'dotenv';
import { ConfigModule, ConfigService } from '@nestjs/config';
import throttlerConfig from '@/config/throttler.config';

dotenv.config();

@Controller('test-rate-limit')
class TestRateLimitController {
  @Get()
  @UseGuards(TransactionRateLimitGuard)
  testRoute() {
    return { success: true };
  }
}

describe('TransactionRateLimitGuard Integration (Real Config)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let auditLogRepo: Repository<CustomerAuditLog>;
  let limit: number;

  beforeAll(async () => {
    const testDbUrl = process.env.DATABASE_URL_TEST || 'postgresql://postgres:123456@localhost:5432/banking_db_test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: testDbUrl,
          entities: [
            User, Account, Transaction, LedgerEntry, FeeSettlementLog,
            TransactionRequest, ReconciliationReport, SystemSetting, RefreshToken, CustomerAuditLog
          ],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([CustomerAuditLog]),
        ConfigModule.forRoot({
          isGlobal: true,
          load: [throttlerConfig],
        }),
        ThrottlerModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) =>
            configService.get<ThrottlerModuleOptions>('throttler') as ThrottlerModuleOptions,
        }),
      ],
      controllers: [TestRateLimitController],
      providers: [CustomerAuditLogsService],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    dataSource = moduleRef.get<DataSource>(DataSource);
    auditLogRepo = dataSource.getRepository(CustomerAuditLog);

    // Resolve the real transaction throttler limit from the config service
    const configService = moduleRef.get<ConfigService>(ConfigService);
    const throttlerOptions = configService.get<ThrottlerModuleOptions>('throttler');
    const throttlers = Array.isArray(throttlerOptions) ? throttlerOptions : throttlerOptions?.throttlers;
    const txThrottler = throttlers?.find((t: ThrottlerOptions) => t.name === 'transactions');
    
    // Fallback to 10 if not found, and handle resolvable limit functions
    if (txThrottler) {
      limit = typeof txThrottler.limit === 'function' ? 10 : txThrottler.limit;
    } else {
      limit = 10;
    }
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.destroy();
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await auditLogRepo.clear();
  });

  it('should allow requests under the limit, then block subsequent requests and log to database', async () => {
    // 1. Send requests up to the limit (limit is read dynamically from real throttler config)
    for (let i = 0; i < limit; i++) {
      await request(app.getHttpServer() as string)
        .get('/test-rate-limit')
        .expect(200)
        .expect({ success: true });
    }

    // Verify no audit log is written yet
    const initialLogCount = await auditLogRepo.count();
    expect(initialLogCount).toBe(0);

    // 2. The (limit + 1)-th request should be blocked with 429
    const response = await request(app.getHttpServer() as string)
      .get('/test-rate-limit')
      .expect(429);

    expect(response.headers['retry-after']).toBeDefined();
    const body = response.body as { message?: string };
    expect(body.message).toContain('Bạn đã thực hiện giao dịch quá nhanh và nhiều lần.');

    // 3. Verify database logged the failure
    const auditLogs = await auditLogRepo.find();
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].status).toBe('failed');
    expect(auditLogs[0].action).toBe('transaction_rate_limited');
  });
});
