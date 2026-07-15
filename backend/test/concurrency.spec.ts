import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsHelper } from '../src/transactions/helpers/transactions.helper';
import { TransactionsService } from '../src/transactions/services/transactions.service';
import { OtpService } from '../src/transactions/services/otp.service';
import { Account, AccountStatus } from '../src/accounts/entities/account.entity';
import { Transaction } from '../src/transactions/entities/transaction.entity';
import { LedgerEntry } from '../src/transactions/entities/ledger-entry.entity';
import { User, UserRole } from '../src/users/entities/user.entity';
import { FeeSettlementLog } from '../src/transactions/entities/fee-settlement-log.entity';
import { TransactionRequest } from '../src/transactions/entities/transaction-request.entity';
import { ReconciliationReport } from '../src/transactions/entities/reconciliation-report.entity';
import { SystemSettingsService } from '../src/system-settings/system-settings.service';
import { SystemSetting } from '../src/system-settings/entities/system-setting.entity';
import { RefreshToken } from '../src/auth/entities/refresh-token.entity';
import { DataSource, Repository } from 'typeorm';
import * as dotenv from 'dotenv';
import { SystemAccount } from '../src/common/enums/system-account.enum';

dotenv.config();

describe('Concurrency Lock Verification Integration', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let service: TransactionsService;
  let accountRepo: Repository<Account>;
  let userRepo: Repository<User>;

  let userA: User;
  let userB: User;
  let userC: User;
  let tellerUser: User;

  let accA: Account;
  let accB: Account;
  let accC: Account;

  beforeAll(async () => {
    const testDbUrl = process.env.DATABASE_URL_TEST || 'postgresql://postgres:123456@localhost:5432/banking_db_test';

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: testDbUrl,
          entities: [
            User, Account, Transaction, LedgerEntry, FeeSettlementLog,
            TransactionRequest, ReconciliationReport, SystemSetting, RefreshToken
          ],
          synchronize: true,
          dropSchema: true,
          logging: false,
          extra: { max: 30 },
        }),
        TypeOrmModule.forFeature([Account, User, Transaction, LedgerEntry, SystemSetting]),
      ],
      providers: [
        TransactionsHelper,
        TransactionsService,
        OtpService,
        {
          provide: SystemSettingsService,
          useValue: {
            getSetting: jest.fn().mockImplementation((key: string) => {
              if (key === 'otp_transaction_threshold') return 10000000;
              if (key === 'transfer_fee') return 0;
              return null;
            }),
          },
        },
      ],
    }).compile();

    dataSource = moduleRef.get<DataSource>(DataSource);
    service = moduleRef.get<TransactionsService>(TransactionsService);
    accountRepo = dataSource.getRepository(Account);
    userRepo = dataSource.getRepository(User);

    // Create system users
    userA = await userRepo.save(userRepo.create({
      passwordHash: 'hash', fullName: 'User A', email: 'a@example.com', phoneNumber: '000000000A', role: UserRole.CUSTOMER
    }));
    userB = await userRepo.save(userRepo.create({
      passwordHash: 'hash', fullName: 'User B', email: 'b@example.com', phoneNumber: '000000000B', role: UserRole.CUSTOMER
    }));
    userC = await userRepo.save(userRepo.create({
      passwordHash: 'hash', fullName: 'User C', email: 'c@example.com', phoneNumber: '000000000C', role: UserRole.CUSTOMER
    }));
    tellerUser = await userRepo.save(userRepo.create({
      passwordHash: 'hash', fullName: 'Teller User', email: 'teller@example.com', phoneNumber: '000000000T', role: UserRole.TELLER
    }));

    // Suspense and Cash Vault accounts are needed by helper
    await accountRepo.save(accountRepo.create({
      accountNumber: SystemAccount.FEE_SUSPENSE, balance: '0.00', status: AccountStatus.ACTIVE, name: 'Suspense', userId: userA.id
    }));
    await accountRepo.save(accountRepo.create({
      accountNumber: SystemAccount.CASH_VAULT, balance: '1000000000.00', status: AccountStatus.ACTIVE, name: 'Cash Vault', userId: userA.id
    }));

    accA = await accountRepo.save(accountRepo.create({ accountNumber: '111', userId: userA.id, balance: '0.00', status: AccountStatus.ACTIVE, name: 'Acc A' }));
    accB = await accountRepo.save(accountRepo.create({ accountNumber: '222', userId: userB.id, balance: '0.00', status: AccountStatus.ACTIVE, name: 'Acc B' }));
    accC = await accountRepo.save(accountRepo.create({ accountNumber: '333', userId: userC.id, balance: '0.00', status: AccountStatus.ACTIVE, name: 'Acc C' }));
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.getRepository(LedgerEntry).createQueryBuilder().delete().execute();
    await dataSource.getRepository(Transaction).createQueryBuilder().delete().execute();
  });

  async function setupBalances(balanceA: string, balanceB: string, balanceC: string) {
    await accountRepo.update({ id: accA.id }, { balance: balanceA, usedDailyLimit: '0.00' });
    await accountRepo.update({ id: accB.id }, { balance: balanceB, usedDailyLimit: '0.00' });
    await accountRepo.update({ id: accC.id }, { balance: balanceC, usedDailyLimit: '0.00' });
  }

  it('1. should process 10 concurrent withdrawals successfully and update balance accurately (Happy Path)', async () => {
    await setupBalances('1000.00', '0.00', '0.00');

    // 10 concurrent requests withdrawing 50.00 each
    const requests = Array.from({ length: 10 }).map((_, idx) => {
      return service.withdraw(
        {
          accountId: accA.id,
          amount: 50,
          description: `Withdrawal ${idx}`,
        },
        tellerUser.id,
        `wd-${Date.now()}-${idx}`
      );
    });

    const results = await Promise.allSettled(requests);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    if (rejected.length > 0) {
      console.log('Rejection reasons for Test 1:', rejected.map(r => r.reason instanceof Error ? r.reason.message : String(r.reason)));
    }

    expect(fulfilled.length).toBe(10);

    const finalAccA = await accountRepo.findOneOrFail({ where: { id: accA.id } });
    // 1000 - (10 * 50) = 500
    expect(finalAccA.balance).toBe('500.00');
  });

  it('2. should prevent negative balance under heavy concurrent load (Race Condition Prevention)', async () => {
    await setupBalances('0.00', '100.00', '0.00');

    // 10 concurrent requests withdrawing 100.00 each when balance is only 100.00
    const requests = Array.from({ length: 10 }).map((_, idx) => {
      return service.withdraw(
        {
          accountId: accB.id,
          amount: 100,
          description: `Over-limit Withdrawal ${idx}`,
        },
        tellerUser.id,
        `ol-wd-${Date.now()}-${idx}`
      );
    });

    const results = await Promise.allSettled(requests);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(9);

    const finalAccB = await accountRepo.findOneOrFail({ where: { id: accB.id } });
    expect(finalAccB.balance).toBe('0.00');

    if (rejected.length > 0) {
      const reason: unknown = (rejected[0]).reason;
      const errorMessage = reason instanceof Error ? reason.message : String(reason);
      expect(errorMessage).toContain('Số dư tài khoản khả dụng không đủ');
    }
  });

  it('3. should prevent deadlock when cross-transferring concurrently', async () => {
    await setupBalances('500.00', '500.00', '0.00');

    // Tx1: A -> B
    const req1 = service.transfer(
      {
        from_accountId: accA.id,
        to_accountNumber: accB.accountNumber,
        amount: '100.00',
        description: 'Transfer A -> B',
      },
      tellerUser.id,
      `xfer-ab-${Date.now()}`
    );

    // Tx2: B -> A
    const req2 = service.transfer(
      {
        from_accountId: accB.id,
        to_accountNumber: accA.accountNumber,
        amount: '100.00',
        description: 'Transfer B -> A',
      },
      tellerUser.id,
      `xfer-ba-${Date.now()}`
    );

    const results = await Promise.allSettled([req1, req2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    if (rejected.length > 0) {
      console.log('Rejection reasons for Test 3:', rejected.map(r => r.reason instanceof Error ? r.reason.message : String(r.reason)));
    }

    expect(fulfilled.length).toBe(2);

    const finalAccA = await accountRepo.findOneOrFail({ where: { id: accA.id } });
    const finalAccB = await accountRepo.findOneOrFail({ where: { id: accB.id } });

    expect(finalAccA.balance).toBe('500.00');
    expect(finalAccB.balance).toBe('500.00');
  });
});
