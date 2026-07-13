/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { DataSource, EntityManager, Repository, Brackets } from 'typeorm';
import { TransactionsHelper } from '../helpers/transactions.helper';
import { OtpService } from './otp.service';
import { SystemSettingsService } from '@/system-settings/system-settings.service';
import { User, UserRole } from '@/users/entities/user.entity';
import { Account } from '@/accounts/entities/account.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionsHelper: jest.Mocked<TransactionsHelper>;
  let dataSource: jest.Mocked<DataSource>;
  let otpService: jest.Mocked<OtpService>;
  let systemSettingsService: jest.Mocked<SystemSettingsService>;
  let transactionRepository: jest.Mocked<Repository<Transaction>>;
  let mockManager: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    mockManager = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    dataSource = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn(),
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
      applySearchFilter: jest.fn(),
      mapToResult: jest.fn(),
      lockAccounts: jest.fn(),
    } as unknown as jest.Mocked<TransactionsHelper>;

    otpService = {
      createOtp: jest.fn(),
      verifyOtp: jest.fn(),
      resendOtp: jest.fn(),
    } as unknown as jest.Mocked<OtpService>;

    systemSettingsService = {
      getSetting: jest.fn(),
    } as unknown as jest.Mocked<SystemSettingsService>;

    transactionRepository = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Transaction>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(Transaction), useValue: transactionRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: TransactionsHelper, useValue: transactionsHelper },
        { provide: OtpService, useValue: otpService },
        { provide: SystemSettingsService, useValue: systemSettingsService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deposit', () => {
    const dto = { accountId: 'acc-1', amount: 100, description: 'Test deposit' };
    const currentUserId = 'user-1';
    const idempotencyKey = 'key-1';

    it('returns existing transaction if idempotency key exists', async () => {
      const existingTx = { id: 'tx-1' } as Transaction;
      transactionsHelper.checkIdempotency.mockResolvedValue(existingTx);

      const result = await service.deposit(dto, currentUserId, idempotencyKey);
      expect(result).toBe(existingTx);
      expect(transactionsHelper.executeTransaction).not.toHaveBeenCalled();
    });

    it('processes deposit successfully', async () => {
      transactionsHelper.checkIdempotency.mockResolvedValue(null);
      const mockAccount = { id: 'acc-1' } as Account;
      transactionsHelper.getAccountWithLock.mockResolvedValue(mockAccount);
      transactionsHelper.validateAmount.mockReturnValue(new Decimal(100));
      transactionsHelper.updateAccountBalance.mockResolvedValue(new Decimal(200));
      const newTx = { id: 'tx-1' } as Transaction;
      transactionsHelper.createAndSaveTransaction.mockResolvedValue(newTx);

      const result = await service.deposit(dto, currentUserId, idempotencyKey);

      expect(transactionsHelper.getAccountWithLock).toHaveBeenCalledWith(mockManager, 'acc-1', currentUserId);
      expect(transactionsHelper.createLedgerEntries).toHaveBeenCalled();
      expect(result).toBe(newTx);
    });
  });

  describe('withdraw', () => {
    const dto = { accountId: 'acc-1', amount: 10000000, description: 'Test withdraw' };
    const currentUserId = 'user-1';
    const idempotencyKey = 'key-1';

    it('creates PENDING_OTP transaction for customer if amount >= threshold', async () => {
      transactionsHelper.checkIdempotency.mockResolvedValue(null);

      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: currentUserId, role: UserRole.CUSTOMER }) };
      dataSource.getRepository.mockReturnValue(mockUserRepo as any);

      systemSettingsService.getSetting.mockReturnValue(10000000); // threshold is 10,000,000

      // setup createPendingOtpTransaction mocks
      const newTx = { id: 'tx-1' } as Transaction;
      transactionRepository.create.mockReturnValue(newTx);
      transactionRepository.save.mockResolvedValue(newTx);

      const result = await service.withdraw(dto, currentUserId, idempotencyKey);

      expect(result).toBe(newTx);
      expect(otpService.createOtp).toHaveBeenCalled();
      expect(transactionsHelper.executeMovement).not.toHaveBeenCalled();
    });

    it('executes directly if amount < threshold', async () => {
      const smallDto = { ...dto, amount: 500 };
      transactionsHelper.checkIdempotency.mockResolvedValue(null);

      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: currentUserId, role: UserRole.CUSTOMER }) };
      dataSource.getRepository.mockReturnValue(mockUserRepo as any);

      systemSettingsService.getSetting.mockReturnValue(10000000);

      const newTx = { id: 'tx-1' } as Transaction;
      transactionRepository.create.mockReturnValue(newTx);
      transactionRepository.save.mockResolvedValue(newTx);
      transactionsHelper.executeMovement.mockResolvedValue(newTx);

      const result = await service.withdraw(smallDto, currentUserId, idempotencyKey);

      expect(transactionsHelper.executeMovement).toHaveBeenCalled();
      expect(result).toBe(newTx);
    });

    it('saves transaction with FAILED status if executeMovement fails', async () => {
      const smallDto = { ...dto, amount: 500 };
      transactionsHelper.checkIdempotency.mockResolvedValue(null);

      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: currentUserId, role: UserRole.CUSTOMER }) };
      dataSource.getRepository.mockReturnValue(mockUserRepo as any);

      systemSettingsService.getSetting.mockReturnValue(10000000);

      const newTx = { id: 'tx-1', status: TransactionStatus.PROCESSING } as Transaction;
      transactionRepository.create.mockReturnValue(newTx);
      transactionRepository.save.mockResolvedValue(newTx);
      transactionsHelper.executeMovement.mockRejectedValue(new Error('Validation failed'));

      await expect(service.withdraw(smallDto, currentUserId, idempotencyKey)).rejects.toThrow('Validation failed');

      expect(newTx.status).toBe(TransactionStatus.FAILED);
      expect(transactionRepository.save).toHaveBeenCalledWith(newTx);
    });
  });

  describe('transfer', () => {
    const dto = { from_accountId: 'acc-1', to_accountNumber: '123456', amount: '100.00', description: 'Test transfer' };
    const currentUserId = 'user-1';
    const idempotencyKey = 'key-1';

    it('throws ForbiddenException if customer is OTP blocked', async () => {
      transactionsHelper.checkIdempotency.mockResolvedValue(null);
      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: currentUserId, role: UserRole.CUSTOMER, isOtpBlocked: true }) };
      dataSource.getRepository.mockReturnValue(mockUserRepo as any);

      await expect(service.transfer(dto, currentUserId, idempotencyKey)).rejects.toThrow(ForbiddenException);
    });

    it('creates PENDING_OTP transaction for customer', async () => {
      transactionsHelper.checkIdempotency.mockResolvedValue(null);
      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: currentUserId, role: UserRole.CUSTOMER, isOtpBlocked: false }) };
      dataSource.getRepository.mockReturnValue(mockUserRepo as any);

      const newTx = { id: 'tx-1' } as Transaction;
      transactionRepository.create.mockReturnValue(newTx);
      transactionRepository.save.mockResolvedValue(newTx);

      const result = await service.transfer(dto, currentUserId, idempotencyKey);
      expect(result).toBe(newTx);
      expect(otpService.createOtp).toHaveBeenCalled();
    });

    it('throws NotFoundException if destination account does not exist (TELLER)', async () => {
      transactionsHelper.checkIdempotency.mockResolvedValue(null);
      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: currentUserId, role: UserRole.TELLER }) };
      const mockAccountRepo = { findOne: jest.fn().mockResolvedValue(null) }; // toAccountRef not found
      dataSource.getRepository.mockImplementation((entity) => {
        if (entity === User) return mockUserRepo as any;
        if (entity === Account) return mockAccountRepo as any;
        return null as any;
      });

      await expect(service.transfer(dto, currentUserId, idempotencyKey)).rejects.toThrow(NotFoundException);
    });

    it('processes transfer directly for TELLER', async () => {
      transactionsHelper.checkIdempotency.mockResolvedValue(null);
      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: currentUserId, role: UserRole.TELLER }) };
      const mockAccountRepo = { findOne: jest.fn().mockResolvedValue({ id: 'acc-2' }) }; // toAccountRef found
      dataSource.getRepository.mockImplementation((entity) => {
        if (entity === User) return mockUserRepo as any;
        if (entity === Account) return mockAccountRepo as any;
        return null as any;
      });
      systemSettingsService.getSetting.mockReturnValue(5); // fee

      const newTx = { id: 'tx-1' } as Transaction;
      transactionRepository.create.mockReturnValue(newTx);
      transactionRepository.save.mockResolvedValue(newTx);
      transactionsHelper.executeMovement.mockResolvedValue(newTx);

      const result = await service.transfer(dto, currentUserId, idempotencyKey);

      expect(transactionRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        type: TransactionType.TRANSFER,
        fee: '5.00',
        totalAmount: '105.00',
      }));
      expect(transactionsHelper.executeMovement).toHaveBeenCalledWith(mockManager, newTx);
      expect(result).toBe(newTx);
    });

    it('saves transaction with FAILED status if executeMovement fails (TELLER)', async () => {
      transactionsHelper.checkIdempotency.mockResolvedValue(null);
      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: currentUserId, role: UserRole.TELLER }) };
      const mockAccountRepo = { findOne: jest.fn().mockResolvedValue({ id: 'acc-2' }) }; // toAccountRef found
      dataSource.getRepository.mockImplementation((entity) => {
        if (entity === User) return mockUserRepo as any;
        if (entity === Account) return mockAccountRepo as any;
        return null as any;
      });
      systemSettingsService.getSetting.mockReturnValue(5); // fee

      const newTx = { id: 'tx-1', status: TransactionStatus.PROCESSING } as Transaction;
      transactionRepository.create.mockReturnValue(newTx);
      transactionRepository.save.mockResolvedValue(newTx);
      transactionsHelper.executeMovement.mockRejectedValue(new Error('Validation failed'));

      await expect(service.transfer(dto, currentUserId, idempotencyKey)).rejects.toThrow('Validation failed');

      expect(newTx.status).toBe(TransactionStatus.FAILED);
      expect(transactionRepository.save).toHaveBeenCalledWith(newTx);
    });
  });

  describe('query methods', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockImplementation((brackets) => {
          if (brackets instanceof Brackets) {
            brackets.whereFactory(mockQueryBuilder);
          }
          return mockQueryBuilder;
        }),
        andWhere: jest.fn().mockImplementation((brackets) => {
          if (brackets instanceof Brackets) {
            brackets.whereFactory(mockQueryBuilder);
          }
          return mockQueryBuilder;
        }),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({}),
        clone: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      transactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('getTransactionsForUser handles pagination and filtering', async () => {
      const result = await service.getTransactionsForUser('user-1', 1, 10, 'acc-1', { search: 'test', fromDate: '2026-01-01', toDate: '2026-01-02' });
      expect(transactionRepository.createQueryBuilder).toHaveBeenCalledWith('tx');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({ data: [], total: 0 });
    });

    it('findAll handles stats and retrieval', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ totalVolume: '100.00', successfulCount: '1', failedCount: '0' });
      const result = await service.findAll(1, 10, 'test', '2026-01-01', '2026-01-02', 'transfer', 'teller-1');
      expect(result.stats).toEqual({ totalVolume: '100.00', successfulCount: 1, failedCount: 0 });
    });

    it('getBranchCashFlowToday groups and calculates cashflow', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { type: TransactionType.DEPOSIT, volume: '500.00' },
        { type: TransactionType.WITHDRAW, volume: '200.00' },
      ]);
      const result = await service.getBranchCashFlowToday();
      expect(result).toEqual({
        totalDepositsToday: '500.00',
        totalWithdrawalsToday: '200.00',
        netCashFlowToday: '300.00',
      });
    });

    it('getTellerTransactionStatsToday groups and returns volumes', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { type: TransactionType.DEPOSIT, volume: '1000.00', count: '5' },
        { type: TransactionType.WITHDRAW, volume: '500.00', count: '2' },
      ]);
      const result = await service.getTellerTransactionStatsToday('teller-1');
      expect(result).toEqual({
        todayDepositsVolume: '1000.00',
        todayWithdrawalsVolume: '500.00',
        todayCompletedCount: 7,
      });
    });

    it('getWeeklyVolume calculates volume maps', async () => {
      const mockTx = [
        { createdAt: new Date(), amount: '100.00' },
      ] as any[];
      mockQueryBuilder.getMany.mockResolvedValue(mockTx);
      const result = await service.getWeeklyVolume();
      expect(result).toHaveLength(7);
    });
  });

  describe('OTP verification and resending', () => {
    const userId = 'user-1';
    const transactionId = 'tx-1';

    it('verifyOtp throws ForbiddenException if OTP blocked', async () => {
      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: userId, isOtpBlocked: true }) };
      dataSource.getRepository.mockReturnValue(mockUserRepo as any);

      await expect(service.verifyOtp(transactionId, '123456', userId)).rejects.toThrow(ForbiddenException);
    });

    it('verifyOtp processes movement successfully if OTP is valid', async () => {
      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: userId, isOtpBlocked: false }) };
      dataSource.getRepository.mockReturnValue(mockUserRepo as any);

      const mockTx = { id: transactionId, status: TransactionStatus.PENDING_OTP } as Transaction;
      transactionRepository.findOne.mockResolvedValue(mockTx);
      transactionRepository.save.mockImplementation((x: any) => Promise.resolve(x));

      await service.verifyOtp(transactionId, '123456', userId);

      expect(otpService.verifyOtp).toHaveBeenCalledWith(transactionId, '123456', userId);
      expect(transactionsHelper.executeTransaction).toHaveBeenCalled();
    });

    it('resendOtp delegates to OtpService', async () => {
      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: userId, isOtpBlocked: false }) };
      dataSource.getRepository.mockReturnValue(mockUserRepo as any);

      await service.resendOtp(transactionId, userId);

      expect(otpService.resendOtp).toHaveBeenCalledWith(transactionId, userId);
    });

    it('verifyOtp throws NotFoundException if transaction is missing', async () => {
      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: userId, isOtpBlocked: false }) };
      dataSource.getRepository.mockReturnValue(mockUserRepo as any);
      transactionRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyOtp(transactionId, '123456', userId)).rejects.toThrow(NotFoundException);
    });

    it('verifyOtp saves transaction with FAILED status if executeTransaction fails', async () => {
      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: userId, isOtpBlocked: false }) };
      dataSource.getRepository.mockReturnValue(mockUserRepo as any);

      const mockTx = { id: transactionId, status: TransactionStatus.PENDING_OTP } as Transaction;
      transactionRepository.findOne.mockResolvedValue(mockTx);
      transactionRepository.save.mockImplementation((x: any) => Promise.resolve(x));

      transactionsHelper.executeTransaction.mockRejectedValue(new Error('Validation failed'));

      await expect(service.verifyOtp(transactionId, '123456', userId)).rejects.toThrow('Validation failed');

      expect(mockTx.status).toBe(TransactionStatus.FAILED);
      expect(transactionRepository.save).toHaveBeenCalledWith(mockTx);
    });

    it('resendOtp throws ForbiddenException if user is OTP blocked', async () => {
      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: userId, isOtpBlocked: true }) };
      dataSource.getRepository.mockReturnValue(mockUserRepo as any);

      await expect(service.resendOtp(transactionId, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('transfer customer edge cases', () => {
    const dto = { from_accountId: 'acc-1', to_accountNumber: '123456', amount: '100.00', description: 'Test transfer' };
    const currentUserId = 'user-1';
    const idempotencyKey = 'key-1';

    it('throws NotFoundException if destination account does not exist (CUSTOMER)', async () => {
      transactionsHelper.checkIdempotency.mockResolvedValue(null);

      // We route repositories to avoid mock pollution
      const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ id: currentUserId, role: UserRole.CUSTOMER, isOtpBlocked: false }) };
      const mockAccountRepo = { findOne: jest.fn().mockResolvedValue(null) }; // destination account not found

      dataSource.getRepository.mockImplementation((entity) => {
        if (entity === User) return mockUserRepo as any;
        if (entity === Account) return mockAccountRepo as any;
        return null;
      });

      await expect(service.transfer(dto, currentUserId, idempotencyKey)).rejects.toThrow(NotFoundException);
    });
  });

  describe('query methods flatMap coverage', () => {
    it('getTransactionsForUser flatMaps correctly with various tx directions', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            // 1. Own account transfer (both from and to user are target userId)
            { id: 'tx-1', fromAccountId: 'acc-1', toAccountId: 'acc-2', fromAccount: { userId: 'user-1' }, toAccount: { userId: 'user-1' } },
            // 2. Debit only (from user is target, to user is different)
            { id: 'tx-2', fromAccountId: 'acc-1', toAccountId: 'acc-3', fromAccount: { userId: 'user-1' }, toAccount: { userId: 'user-2' } },
            // 3. Credit only (to user is target, from user is different)
            { id: 'tx-3', fromAccountId: 'acc-4', toAccountId: 'acc-1', fromAccount: { userId: 'user-2' }, toAccount: { userId: 'user-1' } },
            // 4. Other (neither from nor to user matches - should be filtered out)
            { id: 'tx-4', fromAccountId: 'acc-4', toAccountId: 'acc-5', fromAccount: { userId: 'user-2' }, toAccount: { userId: 'user-3' } },
          ],
          4
        ]),
      };
      transactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Make mapToResult return the tx id and suffix to verify they are called
      transactionsHelper.mapToResult.mockImplementation((tx, dir, counterpart, suffix) => {
        return { id: suffix ? `${tx.id}-${suffix}` : tx.id, direction: dir } as any;
      });

      // Call without accountId to hit user-based flatMap
      const result = await service.getTransactionsForUser('user-1', 1, 10);

      expect(result.total).toBe(4);
      expect(result.data).toHaveLength(4);
      expect(result.data[0]).toEqual({ id: 'tx-1-debit', direction: 'debit' });
      expect(result.data[1]).toEqual({ id: 'tx-1-credit', direction: 'credit' });
      expect(result.data[2]).toEqual({ id: 'tx-2', direction: 'debit' });
      expect(result.data[3]).toEqual({ id: 'tx-3', direction: 'credit' });
    });

    it('getTransactionsForUser flatMaps correctly with accountId parameter', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            // Matches fromAccountId
            { id: 'tx-1', fromAccountId: 'acc-1', toAccountId: 'acc-2' },
            // Matches toAccountId
            { id: 'tx-2', fromAccountId: 'acc-3', toAccountId: 'acc-1' },
            // Matches neither (filtered out)
            { id: 'tx-3', fromAccountId: 'acc-3', toAccountId: 'acc-4' },
          ],
          3
        ]),
      };
      transactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      transactionsHelper.mapToResult.mockImplementation((tx, dir) => {
        return { id: tx.id, direction: dir } as any;
      });

      const result = await service.getTransactionsForUser('user-1', 1, 10, 'acc-1');

      expect(result.total).toBe(3);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ id: 'tx-1', direction: 'debit' });
      expect(result.data[1]).toEqual({ id: 'tx-2', direction: 'credit' });
    });
  });
});
