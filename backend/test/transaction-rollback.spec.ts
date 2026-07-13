import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsHelper } from '../src/transactions/helpers/transactions.helper';
import { Account, AccountStatus } from '../src/accounts/entities/account.entity';
import { Transaction, TransactionType } from '../src/transactions/entities/transaction.entity';
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
import Decimal from 'decimal.js';

dotenv.config();

/**
 * Integration Test for Transaction Rollback.
 * Ensures that if a multi-step transaction fails midway, the database rolls back
 * perfectly without leaving orphan ledger entries or inconsistent account balances.
 */
describe('Transaction Rollback Integration', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let helper: TransactionsHelper;
  let accountRepo: Repository<Account>;
  let userRepo: Repository<User>;
  let ledgerRepo: Repository<LedgerEntry>;
  
  // Test Data
  let userA: User;
  let userB: User;
  let accountA: Account;
  let accountB: Account;

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
          synchronize: true, // Auto-sync for test DB
          dropSchema: true,  // Start fresh
          logging: false,
        }),
        TypeOrmModule.forFeature([Account, User, Transaction, LedgerEntry, SystemSetting]),
      ],
      providers: [
        TransactionsHelper,
        {
          provide: SystemSettingsService,
          useValue: {
            getSetting: jest.fn().mockReturnValue(null), // No daily limit, no fees
          },
        },
      ],
    }).compile();

    dataSource = moduleRef.get<DataSource>(DataSource);
    helper = moduleRef.get<TransactionsHelper>(TransactionsHelper);
    accountRepo = dataSource.getRepository(Account);
    userRepo = dataSource.getRepository(User);
    ledgerRepo = dataSource.getRepository(LedgerEntry);

    // Setup basic accounts
    userA = await userRepo.save(userRepo.create({
      passwordHash: 'hash', fullName: 'User A',
      email: 'a@example.com', phoneNumber: '000000000A', role: UserRole.CUSTOMER
    }));
    userB = await userRepo.save(userRepo.create({
      passwordHash: 'hash', fullName: 'User B',
      email: 'b@example.com', phoneNumber: '000000000B', role: UserRole.CUSTOMER
    }));

    accountA = await accountRepo.save(accountRepo.create({
      accountNumber: '1111111111', userId: userA.id, balance: '1000.00', status: AccountStatus.ACTIVE, name: 'Account A'
    }));
    accountB = await accountRepo.save(accountRepo.create({
      accountNumber: '2222222222', userId: userB.id, balance: '500.00', status: AccountStatus.ACTIVE, name: 'Account B'
    }));
    
    // Create suspense account to avoid "not found" errors
    await accountRepo.save(accountRepo.create({
      accountNumber: SystemAccount.FEE_SUSPENSE, balance: '0.00', status: AccountStatus.ACTIVE, name: 'Suspense', userId: userA.id
    }));
  }, 30000);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.destroy();
    }
  });

  it('rolls back completely if an error occurs during execution', async () => {
    const initialBalanceA = (await accountRepo.findOneOrFail({ where: { id: accountA.id } })).balance;
    const initialBalanceB = (await accountRepo.findOneOrFail({ where: { id: accountB.id } })).balance;
    const initialLedgerCount = await ledgerRepo.count();

    // Mock updateAccountBalance to throw an error on the second call (Credit Account B)
    let callCount = 0;
    const originalUpdateAccountBalance = helper.updateAccountBalance.bind(helper);
    jest.spyOn(helper, 'updateAccountBalance').mockImplementation(async (manager, accountId, amount, operation) => {
      callCount++;
      if (callCount === 2) {
        throw new Error('Simulated Database Crash!');
      }
      return originalUpdateAccountBalance(manager, accountId, amount, operation);
    });

    const txPayload = {
      fromAccountId: accountA.id,
      toAccountId: accountB.id,
      amount: '100.00',
      totalAmount: '100.00',
      fee: '0.00',
      type: TransactionType.TRANSFER,
    };

    // Attempt to execute transaction - should throw
    await expect(
      helper.executeTransaction(async (manager) => {
        const tx = await helper.createAndSaveTransaction(manager, txPayload);
        return helper.executeMovement(manager, tx);
      })
    ).rejects.toThrow('Simulated Database Crash!');

    // VERIFY ROLLBACK
    const finalBalanceA = (await accountRepo.findOneOrFail({ where: { id: accountA.id } })).balance;
    const finalBalanceB = (await accountRepo.findOneOrFail({ where: { id: accountB.id } })).balance;
    const finalLedgerCount = await ledgerRepo.count();

    // Balances must be untouched
    expect(finalBalanceA).toEqual(initialBalanceA);
    expect(finalBalanceB).toEqual(initialBalanceB);

    // No orphan ledger entries
    expect(finalLedgerCount).toEqual(initialLedgerCount);
  });

  it('successfully executes a movement and updates database state (happy path)', async () => {
    const initialBalanceA = (await accountRepo.findOneOrFail({ where: { id: accountA.id } })).balance;
    const initialBalanceB = (await accountRepo.findOneOrFail({ where: { id: accountB.id } })).balance;
    const initialLedgerCount = await ledgerRepo.count();

    const txPayload = {
      fromAccountId: accountA.id,
      toAccountId: accountB.id,
      amount: '100.00',
      totalAmount: '100.00',
      fee: '0.00',
      type: TransactionType.TRANSFER,
    };

    const result = await helper.executeTransaction(async (manager) => {
      const tx = await helper.createAndSaveTransaction(manager, txPayload);
      return helper.executeMovement(manager, tx);
    });

    expect(result.status).toEqual('completed');

    const finalBalanceA = (await accountRepo.findOneOrFail({ where: { id: accountA.id } })).balance;
    const finalBalanceB = (await accountRepo.findOneOrFail({ where: { id: accountB.id } })).balance;
    const finalLedgerCount = await ledgerRepo.count();

    // Verify balance changes
    expect(new Decimal(finalBalanceA).toFixed(2)).toEqual(new Decimal(initialBalanceA).minus(100).toFixed(2));
    expect(new Decimal(finalBalanceB).toFixed(2)).toEqual(new Decimal(initialBalanceB).plus(100).toFixed(2));

    // Verify ledger entries created (1 debit, 1 credit)
    expect(finalLedgerCount).toEqual(initialLedgerCount + 2);
  });
});
