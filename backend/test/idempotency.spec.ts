import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { IdempotencyKey } from '../src/transactions/entities/idempotency-key.entity';
import { IdempotencyService } from '../src/transactions/services/idempotency.service';
import { User } from '../src/users/entities/user.entity';
import { Account } from '../src/accounts/entities/account.entity';
import { Transaction } from '../src/transactions/entities/transaction.entity';
import { LedgerEntry } from '../src/transactions/entities/ledger-entry.entity';
import { FeeSettlementLog } from '../src/transactions/entities/fee-settlement-log.entity';
import { TransactionRequest } from '../src/transactions/entities/transaction-request.entity';
import { ReconciliationReport } from '../src/transactions/entities/reconciliation-report.entity';
import { SystemSetting } from '../src/system-settings/entities/system-setting.entity';
import { RefreshToken } from '../src/auth/entities/refresh-token.entity';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

describe('Idempotency Engine Integration Tests (Module 2)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let idempotencyService: IdempotencyService;
  let idempotencyKeyRepo: Repository<IdempotencyKey>;

  beforeAll(async () => {
    const testDbUrl = process.env.DATABASE_URL_TEST || 'postgresql://postgres:123456@localhost:5432/banking_db_test';

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: testDbUrl,
          entities: [
            User, Account, Transaction, LedgerEntry, FeeSettlementLog,
            TransactionRequest, ReconciliationReport, SystemSetting, RefreshToken,
            IdempotencyKey,
          ],
          synchronize: true,
          dropSchema: true,
          logging: false,
          extra: { max: 30 },
        }),
        TypeOrmModule.forFeature([IdempotencyKey]),
      ],
      providers: [IdempotencyService],
    }).compile();

    dataSource = moduleRef.get<DataSource>(DataSource);
    idempotencyService = moduleRef.get<IdempotencyService>(IdempotencyService);
    idempotencyKeyRepo = dataSource.getRepository(IdempotencyKey);
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await idempotencyKeyRepo.createQueryBuilder().delete().execute();
  });

  it('1. should calculate deterministic request hash regardless of key order', () => {
    const userId = 'user-123';
    const method = 'POST';
    const endpoint = '/transactions/transfer';

    const payloadA = { amount: '100.00', to_accountNumber: 'VN123456', description: 'Test' };
    const payloadB = { description: 'Test', amount: '100.00', to_accountNumber: 'VN123456' };

    const hashA = idempotencyService.generateRequestHash(userId, method, endpoint, payloadA);
    const hashB = idempotencyService.generateRequestHash(userId, method, endpoint, payloadB);

    expect(hashA).toBe(hashB);
  });

  it('2. should execute handler once and cache response for 5 concurrent requests with identical key & payload', async () => {
    const key = uuidv4();
    const userId = 'user-456';
    const method = 'POST';
    const endpoint = '/transactions/transfer';
    const payload = { amount: '500.00', to_accountNumber: 'VN888888' };

    let executionCount = 0;

    const executeRequest = () =>
      idempotencyService.process(
        key,
        userId,
        method,
        endpoint,
        payload,
        async () => {
          executionCount++;
          // Simulate brief DB work
          await new Promise((res) => setTimeout(res, 50));
          return { id: 'tx-mock-1', status: 'completed', amount: '500.00' };
        },
      );

    // Send 5 identical requests concurrently
    const promises = Array.from({ length: 5 }).map(() => executeRequest());
    const results = await Promise.all(promises);

    // Only 1 execution of business logic
    expect(executionCount).toBe(1);

    // All 5 responses must be identical
    results.forEach((res) => {
      expect(res).toEqual({ id: 'tx-mock-1', status: 'completed', amount: '500.00' });
    });

    // Check DB record
    const dbRecord = await idempotencyKeyRepo.findOne({ where: { key } });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.status).toBe('completed');
  });

  it('3. should throw 409 Conflict if same idempotency key is reused with a different payload', async () => {
    const key = uuidv4();
    const userId = 'user-789';
    const method = 'POST';
    const endpoint = '/transactions/transfer';

    const originalPayload = { amount: '100.00', to_accountNumber: 'VN111111' };
    const modifiedPayload = { amount: '999.00', to_accountNumber: 'VN111111' };

    // First request
    await idempotencyService.process(
      key,
      userId,
      method,
      endpoint,
      originalPayload,
      () => Promise.resolve({ id: 'tx-orig', status: 'completed' }),
    );

    // Second request with SAME key but MODIFIED payload
    await expect(
      idempotencyService.process(
        key,
        userId,
        method,
        endpoint,
        modifiedPayload,
        () => Promise.resolve({ id: 'tx-mod', status: 'completed' }),
      ),
    ).rejects.toThrow(ConflictException);
  });
});
