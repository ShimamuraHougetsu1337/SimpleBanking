/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FraudDetectionService } from './fraud-detection.service';
import { FraudFlag, FraudFlagStatus, FraudRuleName } from './entities/fraud-flag.entity';
import { Transaction } from '@/transactions/entities/transaction.entity';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';
import { User, UserRole } from '@/users/entities/user.entity';

describe('FraudDetectionService', () => {
  let service: FraudDetectionService;
  let fraudFlagRepo: jest.Mocked<Repository<FraudFlag>>;
  let transactionRepo: jest.Mocked<Repository<Transaction>>;
  let accountRepo: jest.Mocked<Repository<Account>>;
  let dataSource: jest.Mocked<DataSource>;
  let mockManager: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    mockManager = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((entity, data) => ({ id: 'flag-1', ...data })),
      save: jest.fn().mockImplementation((entity, data) => Promise.resolve(data)),
    } as unknown as jest.Mocked<EntityManager>;

    dataSource = {
      createQueryRunner: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    fraudFlagRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    } as unknown as jest.Mocked<Repository<FraudFlag>>;

    transactionRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Transaction>>;

    accountRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as jest.Mocked<Repository<Account>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudDetectionService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(FraudFlag), useValue: fraudFlagRepo },
        { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
        { provide: getRepositoryToken(Account), useValue: accountRepo },
      ],
    }).compile();

    service = module.get<FraudDetectionService>(FraudDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkTransaction', () => {
    it('flags HIGH_FREQUENCY_1MIN if 5 or more transactions exist in last 1 minute', async () => {
      const mockQbCount = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };

      const mockQbAvg = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgAmount: '100000', txCount: '1' }),
      };

      mockManager.createQueryBuilder.mockImplementation((entity: any) => {
        if (entity === Transaction) {
          // first call for count, second for avg
          if (mockManager.createQueryBuilder.mock.calls.length % 2 === 1) {
            return mockQbCount as any;
          }
          return mockQbAvg as any;
        }
        return {} as any;
      });

      const tx = { id: 'tx-100', amount: '100000' } as Transaction;
      const flags = await service.checkTransaction(mockManager, tx, 'acc-1');

      expect(flags.length).toBeGreaterThanOrEqual(1);
      expect(flags[0].ruleName).toBe(FraudRuleName.HIGH_FREQUENCY_1MIN);
    });

    it('flags HIGH_VALUE_SPIKE_30D if amount is 5x or more than 30d average', async () => {
      const mockQbCount = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };

      const mockQbAvg = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgAmount: '100000', txCount: '5' }),
      };

      let callCount = 0;
      mockManager.createQueryBuilder.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? (mockQbCount as any) : (mockQbAvg as any);
      });

      const tx = { id: 'tx-100', amount: '600000' } as Transaction; // 600k >= 5 * 100k
      const flags = await service.checkTransaction(mockManager, tx, 'acc-1');

      expect(flags.length).toBe(1);
      expect(flags[0].ruleName).toBe(FraudRuleName.HIGH_VALUE_SPIKE_30D);
    });
  });

  describe('reviewFraudFlag', () => {
    const adminUser = { id: 'admin-1', role: UserRole.SUPERADMIN } as User;

    it('throws NotFoundException if flag does not exist', async () => {
      fraudFlagRepo.findOne.mockResolvedValue(null);

      await expect(
        service.reviewFraudFlag('invalid-id', { status: FraudFlagStatus.APPROVED }, adminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if flag is already reviewed', async () => {
      const existingFlag = {
        id: 'flag-1',
        status: FraudFlagStatus.APPROVED,
      } as FraudFlag;
      fraudFlagRepo.findOne.mockResolvedValue(existingFlag);

      await expect(
        service.reviewFraudFlag('flag-1', { status: FraudFlagStatus.REJECTED }, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('approves flag and updates status', async () => {
      const existingFlag = {
        id: 'flag-1',
        status: FraudFlagStatus.PENDING_REVIEW,
        accountId: 'acc-1',
      } as FraudFlag;
      fraudFlagRepo.findOne.mockResolvedValue(existingFlag);

      const result = await service.reviewFraudFlag(
        'flag-1',
        { status: FraudFlagStatus.APPROVED, reviewNote: 'Looks good' },
        adminUser,
      );

      expect(result.status).toBe(FraudFlagStatus.APPROVED);
      expect(result.reviewNote).toBe('Looks good');
      expect(result.reviewedById).toBe(adminUser.id);
    });

    it('rejects flag and locks account if lockAccount is true', async () => {
      const existingFlag = {
        id: 'flag-1',
        status: FraudFlagStatus.PENDING_REVIEW,
        accountId: 'acc-1',
        account: { id: 'acc-1' } as Account,
      } as FraudFlag;
      fraudFlagRepo.findOne.mockResolvedValue(existingFlag);

      const result = await service.reviewFraudFlag(
        'flag-1',
        { status: FraudFlagStatus.REJECTED, lockAccount: true, reviewNote: 'Fraud confirmed' },
        adminUser,
      );

      expect(result.status).toBe(FraudFlagStatus.REJECTED);
      expect(accountRepo.update).toHaveBeenCalledWith('acc-1', { status: AccountStatus.LOCKED });
    });
  });
});
