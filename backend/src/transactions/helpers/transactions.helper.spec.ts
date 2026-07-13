/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsHelper } from './transactions.helper';
import { DataSource, EntityManager } from 'typeorm';
import { SystemSettingsService } from '@/system-settings/system-settings.service';
import { BadRequestException, UnprocessableEntityException, NotFoundException } from '@nestjs/common';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { SystemAccount } from '@/common/enums/system-account.enum';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import Decimal from 'decimal.js';

describe('TransactionsHelper', () => {
  let helper: TransactionsHelper;
  let dataSource: jest.Mocked<DataSource>;
  let systemSettingsService: jest.Mocked<SystemSettingsService>;
  let mockManager: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    mockManager = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    dataSource = {
      getRepository: jest.fn(),
      createQueryRunner: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    systemSettingsService = {
      getSetting: jest.fn(),
    } as unknown as jest.Mocked<SystemSettingsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsHelper,
        { provide: DataSource, useValue: dataSource },
        { provide: SystemSettingsService, useValue: systemSettingsService },
      ],
    }).compile();

    helper = module.get<TransactionsHelper>(TransactionsHelper);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear private cached value for suspense account using reflection
    (helper as any).suspenseAccountId = null;
  });

  describe('validateAmount', () => {
    it('throws BadRequestException if amount is 0', () => {
      expect(() => helper.validateAmount(0)).toThrow(BadRequestException);
      expect(() => helper.validateAmount('0')).toThrow(BadRequestException);
    });

    it('throws BadRequestException if amount is negative', () => {
      expect(() => helper.validateAmount(-100)).toThrow(BadRequestException);
      expect(() => helper.validateAmount('-100')).toThrow(BadRequestException);
    });

    it('throws BadRequestException if amount has more than 2 decimal places', () => {
      expect(() => helper.validateAmount('10.001')).toThrow(BadRequestException);
    });

    it('returns Decimal instance if amount is valid (without balance check)', () => {
      const result = helper.validateAmount('10.50');
      expect(result).toBeInstanceOf(Decimal);
      expect(result.toString()).toBe('10.5'); // trailing zeros might be dropped by toString
      expect(result.toFixed(2)).toBe('10.50');
    });

    it('throws UnprocessableEntityException if amount exceeds available balance', () => {
      expect(() => helper.validateAmount('100.01', '100.00')).toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException considering holdBalance', () => {
      // Balance 100, hold 20 => available 80. Try amount 85 => throws
      expect(() => helper.validateAmount('85', '100', '20')).toThrow(UnprocessableEntityException);
    });

    it('passes if amount is exactly equal to available balance', () => {
      const result = helper.validateAmount('100', '100.00');
      expect(result.toFixed(2)).toBe('100.00');
    });
  });

  describe('validateLimitsAndBalances (via wrapper to test private method)', () => {
    let validateLimitsAndBalances: any;

    beforeEach(() => {
      validateLimitsAndBalances = (helper as any).validateLimitsAndBalances.bind(helper);
    });

    it('throws UnprocessableEntityException if source account is missing for TRANSFER', async () => {
      await expect(
        validateLimitsAndBalances(mockManager, TransactionType.TRANSFER, null, null, new Decimal(10), new Decimal(10))
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException if source account is LOCKED for WITHDRAW', async () => {
      const fromAccount = { status: AccountStatus.LOCKED } as Account;
      await expect(
        validateLimitsAndBalances(mockManager, TransactionType.WITHDRAW, fromAccount, null, new Decimal(10), new Decimal(10))
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException if totalAmount > balance', async () => {
      const fromAccount = { status: AccountStatus.ACTIVE, balance: '100.00' } as Account;
      await expect(
        validateLimitsAndBalances(mockManager, TransactionType.TRANSFER, fromAccount, null, new Decimal(50), new Decimal(100.01))
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws BadRequestException if usedDailyLimit + amount > dailyLimit', async () => {
      const fromAccount = {
        id: '123',
        status: AccountStatus.ACTIVE,
        balance: '1000.00',
        usedDailyLimit: '400.00',
      } as Account;

      systemSettingsService.getSetting.mockReturnValue(500); // System limit is 500

      // Try transfer 101, used 400 + 101 = 501 > 500
      await expect(
        validateLimitsAndBalances(mockManager, TransactionType.TRANSFER, fromAccount, null, new Decimal(101), new Decimal(101))
      ).rejects.toThrow(BadRequestException);
    });

    it('passes and updates usedDailyLimit if within limit', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };
      mockManager.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const fromAccount = {
        id: '123',
        status: AccountStatus.ACTIVE,
        balance: '1000.00',
        usedDailyLimit: '400.00',
      } as Account;

      const toAccount = { status: AccountStatus.ACTIVE } as Account;

      systemSettingsService.getSetting.mockReturnValue(500); // System limit is 500

      // Try transfer 100, used 400 + 100 = 500 <= 500
      await validateLimitsAndBalances(
        mockManager,
        TransactionType.TRANSFER,
        fromAccount,
        toAccount,
        new Decimal(100),
        new Decimal(100)
      );

      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(Account);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', { id: '123' });
    });

    it('throws UnprocessableEntityException if TRANSFER and toAccount is LOCKED', async () => {
      systemSettingsService.getSetting.mockReturnValue(null);
      const fromAccount = { status: AccountStatus.ACTIVE, balance: '1000.00' } as Account;
      const toAccount = { status: AccountStatus.LOCKED } as Account;

      await expect(
        validateLimitsAndBalances(mockManager, TransactionType.TRANSFER, fromAccount, toAccount, new Decimal(10), new Decimal(10))
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('updateAccountBalance', () => {
    it('returns 0 without DB call if account is suspense account', async () => {
      // Mock getSuspenseAccountId
      const mockAccount = { id: 'suspense-123', accountNumber: SystemAccount.FEE_SUSPENSE };
      const mockRepo = { findOne: jest.fn().mockResolvedValue(mockAccount) };
      dataSource.getRepository.mockReturnValue(mockRepo as any);

      const result = await helper.updateAccountBalance(mockManager, 'suspense-123', new Decimal(10), 'add');
      
      expect(result.toFixed(2)).toBe('0.00');
      expect(mockManager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('calls createQueryBuilder to update balance and returns new balance', async () => {
      const mockRepo = { findOne: jest.fn().mockResolvedValue({ id: 'suspense-123', accountNumber: SystemAccount.FEE_SUSPENSE }) };
      dataSource.getRepository.mockReturnValue(mockRepo as any);

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ raw: [{ balance: '250.00' }] }),
      };
      mockManager.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await helper.updateAccountBalance(mockManager, 'acc-123', new Decimal(50), 'add');

      expect(result.toFixed(2)).toBe('250.00');
      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ balance: expect.any(Function) });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', { id: 'acc-123' });
    });
  });

  describe('getAccountWithLock', () => {
    it('returns account when found', async () => {
      const mockAccount = { id: 'acc-123', status: AccountStatus.ACTIVE };
      mockManager.findOne.mockResolvedValue(mockAccount);

      const result = await helper.getAccountWithLock(mockManager, 'acc-123', 'user-1');

      expect(result).toBe(mockAccount);
      expect(mockManager.findOne).toHaveBeenCalledWith(Account, {
        where: { id: 'acc-123', status: AccountStatus.ACTIVE, userId: 'user-1' },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('throws NotFoundException when account is missing', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(helper.getAccountWithLock(mockManager, 'acc-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSuspenseAccountId', () => {
    it('returns suspense account id and caches it', async () => {
      const mockRepo = { findOne: jest.fn().mockResolvedValue({ id: 'suspense-123' }) };
      dataSource.getRepository.mockReturnValue(mockRepo as any);

      const result1 = await helper.getSuspenseAccountId();
      expect(result1).toBe('suspense-123');
      expect(mockRepo.findOne).toHaveBeenCalled();

      // Second call should return cached value without querying DB again
      mockRepo.findOne.mockClear();
      const result2 = await helper.getSuspenseAccountId();
      expect(result2).toBe('suspense-123');
      expect(mockRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws error if suspense account is missing', async () => {
      const mockRepo = { findOne: jest.fn().mockResolvedValue(null) };
      dataSource.getRepository.mockReturnValue(mockRepo as any);

      await expect(helper.getSuspenseAccountId()).rejects.toThrow('SYS_FEE_SUSPENSE account not found');
    });
  });

  describe('executeTransaction', () => {
    let mockQueryRunner: any;

    beforeEach(() => {
      mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {},
      };
      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
    });

    it('commits transaction on success', async () => {
      const operation = jest.fn().mockResolvedValue('success-val');

      const result = await helper.executeTransaction(operation);

      expect(result).toBe('success-val');
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(operation).toHaveBeenCalledWith(mockQueryRunner.manager);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('rolls back transaction on error', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('test-err'));

      await expect(helper.executeTransaction(operation)).rejects.toThrow('test-err');

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('checkIdempotency', () => {
    it('queries transaction repository for idempotency key', async () => {
      const mockTx = { id: 'tx-123' };
      const mockRepo = { findOne: jest.fn().mockResolvedValue(mockTx) };
      dataSource.getRepository.mockReturnValue(mockRepo as any);

      const result = await helper.checkIdempotency('key-123');
      expect(result).toBe(mockTx);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { idempotencyKey: 'key-123' } });
    });
  });

  describe('applySearchFilter', () => {
    it('applies search filter on query builder', () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockImplementation((brackets) => {
          // Execute the brackets callback to test its internal queries
          const mockInnerQb = {
            where: jest.fn().mockReturnThis(),
            orWhere: jest.fn().mockReturnThis(),
          };
          brackets.whereFactory(mockInnerQb);
          expect(mockInnerQb.where).toHaveBeenCalledWith('tx.description ILIKE :search', { search: '%test%' });
          expect(mockInnerQb.orWhere).toHaveBeenCalledTimes(5);
        }),
      };

      helper.applySearchFilter(mockQueryBuilder as any, '%test%');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('mapToResult', () => {
    const mockTx = {
      id: 'tx-123',
      type: TransactionType.TRANSFER,
      amount: '100.00',
      fee: '5.00',
      totalAmount: '105.00',
    } as any;

    it('maps with counterparty user fullName', () => {
      const counterpart = { user: { fullName: 'John Doe' } } as any;
      const result = helper.mapToResult(mockTx, 'debit', counterpart);

      expect(result).toEqual({
        id: 'tx-123',
        type: TransactionType.TRANSFER,
        direction: 'debit',
        amount: '100.00',
        fee: '5.00',
        totalAmount: '105.00',
        counterpartName: 'John Doe',
      });
    });

    it('maps with counterparty account name if user fullName is missing', () => {
      const counterpart = { name: 'Savings Account' } as any;
      const result = helper.mapToResult(mockTx, 'credit', counterpart);

      expect(result.counterpartName).toBe('Savings Account');
    });

    it('maps with default name if counterparty is missing', () => {
      const result = helper.mapToResult(mockTx, 'debit', null);
      expect(result.counterpartName).toBe('Hệ thống');
    });

    it('appends suffix to transaction id if provided', () => {
      const result = helper.mapToResult(mockTx, 'debit', null, 'debit');
      expect(result.id).toBe('tx-123-debit');
    });
  });

  describe('executeMovement and buildLedgerEntriesList', () => {
    let mockTx: Transaction;
    let fromAccount: Account;
    let toAccount: Account;

    beforeEach(() => {
      mockTx = {
        id: 'tx-123',
        type: TransactionType.TRANSFER,
        fromAccountId: 'acc-from',
        toAccountId: 'acc-to',
        amount: '100.00',
        fee: '5.00',
        totalAmount: '105.00',
        description: 'Test TRANSFER with fee',
        status: TransactionStatus.PROCESSING,
      } as any;

      fromAccount = {
        id: 'acc-from',
        balance: '1000.00',
        usedDailyLimit: '0.00',
        status: AccountStatus.ACTIVE,
      } as any;

      toAccount = {
        id: 'acc-to',
        balance: '500.00',
        usedDailyLimit: '0.00',
        status: AccountStatus.ACTIVE,
      } as any;

      // Mock suspense account repo
      const mockAccountRepo = { findOne: jest.fn().mockResolvedValue({ id: 'suspense-id' }) };
      dataSource.getRepository.mockReturnValue(mockAccountRepo as any);
      
      // Mock systemSettingsService to return null for limits and fees to cover default branches
      systemSettingsService.getSetting.mockReturnValue(null);
    });

    it('processes transfer with fee > 0 correctly', async () => {
      let callCount = 0;
      mockManager.findOne.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(fromAccount);
        if (callCount === 2) return Promise.resolve(toAccount);
        return Promise.resolve(null);
      });

      // Mock updateAccountBalance to return balance decrements/increments
      helper.updateAccountBalance = jest.fn()
        .mockResolvedValueOnce(new Decimal('900.00')) // subtract amount
        .mockResolvedValueOnce(new Decimal('895.00')) // subtract fee
        .mockResolvedValueOnce(new Decimal('600.00')); // add amount

      (mockManager.create as any).mockImplementation((_entity: any, data: any) => data);
      (mockManager.save as any).mockImplementation((_entity: any, data: any) => Promise.resolve(data));

      const result = await helper.executeMovement(mockManager, mockTx);

      expect(result.status).toBe(TransactionStatus.COMPLETED);
      expect(helper.updateAccountBalance).toHaveBeenCalledTimes(3);

      // Verify double entry ledger entries created (1 debit amount, 1 debit fee, 1 credit fee to suspense, 1 credit amount)
      expect(mockManager.save).toHaveBeenCalledWith(LedgerEntry, expect.arrayContaining([
        expect.objectContaining({ accountId: 'acc-from', amount: '100.00', type: 'debit' }),
        expect.objectContaining({ accountId: 'acc-from', amount: '5.00', type: 'debit' }),
        expect.objectContaining({ accountId: 'suspense-id', amount: '5.00', type: 'credit' }),
        expect.objectContaining({ accountId: 'acc-to', amount: '100.00', type: 'credit' }),
      ]));
    });

    it('processes deposit (no fromAccount) correctly', async () => {
      mockTx.type = TransactionType.DEPOSIT;
      mockTx.fromAccountId = null;
      mockTx.toAccountId = 'acc-to';
      mockTx.fee = '0.00';
      mockTx.totalAmount = '100.00';

      mockManager.findOne.mockResolvedValue(toAccount);
      helper.updateAccountBalance = jest.fn().mockResolvedValue(new Decimal('600.00'));
      (mockManager.create as any).mockImplementation((_entity: any, data: any) => data);
      (mockManager.save as any).mockImplementation((_entity: any, data: any) => Promise.resolve(data));

      const result = await helper.executeMovement(mockManager, mockTx);

      expect(result.status).toBe(TransactionStatus.COMPLETED);
      expect(helper.updateAccountBalance).toHaveBeenCalledTimes(1);
      expect(mockManager.save).toHaveBeenCalledWith(LedgerEntry, [
        expect.objectContaining({ accountId: 'acc-to', amount: '100.00', type: 'credit' }),
      ]);
    });
  });
});
