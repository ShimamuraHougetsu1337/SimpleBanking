/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
 
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionRequestsService } from './transaction-requests.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionRequest, TransactionRequestType, TransactionRequestStatus } from '../entities/transaction-request.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { TransactionsHelper } from '../helpers/transactions.helper';
import { SystemSettingsService } from '@/system-settings/system-settings.service';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { ReversalService } from './reversal.service';
import Decimal from 'decimal.js';

describe('TransactionRequestsService', () => {
  let service: TransactionRequestsService;
  let transactionsHelper: jest.Mocked<TransactionsHelper>;
  let dataSource: jest.Mocked<DataSource>;
  let systemSettingsService: jest.Mocked<SystemSettingsService>;
  let transactionRequestRepository: jest.Mocked<Repository<TransactionRequest>>;
  let mockManager: jest.Mocked<EntityManager>;
  let reversalService: jest.Mocked<ReversalService>;

  beforeEach(async () => {
    mockManager = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      }),
    } as unknown as jest.Mocked<EntityManager>;

    dataSource = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
      }),
      createQueryRunner: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    transactionsHelper = {
      checkIdempotency: jest.fn(),
      executeTransaction: jest.fn((cb) => cb(mockManager)),
      getAccountWithLock: jest.fn(),
      validateAmount: jest.fn(),
      updateAccountBalance: jest.fn(),
      createAndSaveTransaction: jest.fn(),
      createLedgerEntries: jest.fn(),
      executeMovement: jest.fn(),
      lockAccounts: jest.fn(),
      getSuspenseAccountId: jest.fn().mockResolvedValue('suspense-123'),
      getCashVaultAccountId: jest.fn().mockResolvedValue('cashvault-123'),
    } as unknown as jest.Mocked<TransactionsHelper>;

    systemSettingsService = {
      getSetting: jest.fn(),
    } as unknown as jest.Mocked<SystemSettingsService>;

    transactionRequestRepository = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<Repository<TransactionRequest>>;

    reversalService = {
      reverseTransaction: jest.fn(),
    } as unknown as jest.Mocked<ReversalService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionRequestsService,
        { provide: getRepositoryToken(TransactionRequest), useValue: transactionRequestRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: TransactionsHelper, useValue: transactionsHelper },
        { provide: SystemSettingsService, useValue: systemSettingsService },
        { provide: ReversalService, useValue: reversalService },
      ],
    }).compile();

    service = module.get<TransactionRequestsService>(TransactionRequestsService);
  });

  describe('adminTransfer', () => {
    const fromAccountId = 'acc-source';
    const toAccountNumber = 'VN10001000001002';
    const currentUserId = 'teller-1';
    const idempotencyKey = 'some-key';
    const description = 'Test admin transfer';

    const sourceAccount = {
      id: 'acc-source',
      accountNumber: 'VN10001000001001',
      balance: '1000000000.00',
      holdBalance: '0.00',
      status: AccountStatus.ACTIVE,
    } as Account;

    const destAccount = {
      id: 'acc-dest',
      accountNumber: 'VN10001000001002',
      balance: '50000.00',
      holdBalance: '0.00',
      status: AccountStatus.ACTIVE,
    } as Account;

    beforeEach(() => {
      transactionsHelper.checkIdempotency.mockResolvedValue(null);
      transactionsHelper.validateAmount.mockImplementation((amt) => new Decimal(amt));
      transactionsHelper.getAccountWithLock.mockResolvedValue(sourceAccount);
      mockManager.findOne.mockImplementation((entityClass, options: any) => {
        if (options?.where?.accountNumber === toAccountNumber) {
          return Promise.resolve(destAccount);
        }
        return Promise.resolve(null);
      });
      systemSettingsService.getSetting.mockImplementation((key) => {
        if (key === 'high_value_transaction_threshold') return 500000000;
        if (key === 'transfer_fee') return 5000;
        return null;
      });
    });

    it('creates auto approved transfer if amount is <= threshold', async () => {
      const amountStr = '100000'; // 100k
      
      const mockRequest = {
        id: 'req-123',
        accountId: fromAccountId,
        toAccountNumber,
        amount: amountStr,
        type: TransactionRequestType.TRANSFER,
        status: TransactionRequestStatus.AUTO_APPROVED,
      } as TransactionRequest;

      const mockTx = {
        id: 'tx-123',
        fromAccountId,
        toAccountId: destAccount.id,
        amount: amountStr,
        fee: '5000.00',
        totalAmount: '105000.00',
        type: TransactionType.TRANSFER,
        status: TransactionStatus.COMPLETED,
      } as Transaction;

      mockManager.create.mockImplementation((entityClass, data: any) => {
        if (entityClass === TransactionRequest) return { ...mockRequest, ...data };
        if (entityClass === Transaction) return { ...mockTx, ...data };
        return {};
      });

      mockManager.save.mockImplementation((entityClass, obj: any) => Promise.resolve(obj));

      const result = await service.adminTransfer(
        fromAccountId,
        toAccountNumber,
        amountStr,
        description,
        idempotencyKey,
        currentUserId,
      );

      expect(transactionsHelper.getAccountWithLock).toHaveBeenCalledWith(mockManager, fromAccountId);
      expect(mockManager.save).toHaveBeenCalled();
      expect(result).toHaveProperty('status', TransactionStatus.COMPLETED);
    });

    it('creates pending transfer if amount is > threshold', async () => {
      const amountStr = '600000000'; // 600m > 500m

      const mockRequest = {
        id: 'req-pending',
        accountId: fromAccountId,
        toAccountNumber,
        amount: amountStr,
        type: TransactionRequestType.TRANSFER,
        status: TransactionRequestStatus.PENDING,
      } as TransactionRequest;

      mockManager.create.mockImplementation((entityClass, data: any) => {
        if (entityClass === TransactionRequest) return { ...mockRequest, ...data };
        return {};
      });

      mockManager.save.mockImplementation((entityClass, obj: any) => Promise.resolve(obj));

      const result = await service.adminTransfer(
        fromAccountId,
        toAccountNumber,
        amountStr,
        description,
        idempotencyKey,
        currentUserId,
      );

      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
      expect(result).toHaveProperty('status', TransactionRequestStatus.PENDING);
    });
  });
});
