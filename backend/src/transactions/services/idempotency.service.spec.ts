/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyKey, IdempotencyStatus } from '../entities/idempotency-key.entity';

describe('IdempotencyService Unit Tests', () => {
  let service: IdempotencyService;
  let repository: jest.Mocked<Repository<IdempotencyKey>>;

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<IdempotencyKey>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: getRepositoryToken(IdempotencyKey),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRequestHash', () => {
    it('generates identical hashes for payloads with different key orders', () => {
      const payloadA = { b: 2, a: 1, c: { y: 'test', x: 100 } };
      const payloadB = { a: 1, c: { x: 100, y: 'test' }, b: 2 };

      const hashA = service.generateRequestHash('user-1', 'POST', '/transactions/transfer', payloadA);
      const hashB = service.generateRequestHash('user-1', 'POST', '/transactions/transfer', payloadB);

      expect(hashA).toBe(hashB);
      expect(hashA).toHaveLength(64); // SHA-256 length
    });

    it('generates different hashes for different payloads', () => {
      const payloadA = { amount: '100.00' };
      const payloadB = { amount: '200.00' };

      const hashA = service.generateRequestHash('user-1', 'POST', '/transactions/transfer', payloadA);
      const hashB = service.generateRequestHash('user-1', 'POST', '/transactions/transfer', payloadB);

      expect(hashA).not.toBe(hashB);
    });
  });

  describe('process', () => {
    const key = 'key-uuid-123';
    const userId = 'user-1';
    const method = 'POST';
    const endpoint = '/transactions/transfer';
    const body = { amount: '100.00' };

    it('returns cached response if key exists with matching hash and status COMPLETED', async () => {
      const requestHash = service.generateRequestHash(userId, method, endpoint, body);
      const existingRecord = {
        key,
        requestHash,
        status: IdempotencyStatus.COMPLETED,
        response: { id: 'tx-123', status: 'completed' },
      } as unknown as IdempotencyKey;

      repository.findOne.mockResolvedValue(existingRecord);

      const handler = jest.fn();
      const result = await service.process(key, userId, method, endpoint, body, handler);

      expect(result).toEqual({ id: 'tx-123', status: 'completed' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('throws ConflictException (409) if key exists but payload hash differs', async () => {
      const existingRecord = {
        key,
        requestHash: 'different-hash',
        status: IdempotencyStatus.COMPLETED,
        response: { id: 'tx-123' },
      } as unknown as IdempotencyKey;

      repository.findOne.mockResolvedValue(existingRecord);

      const handler = jest.fn();
      await expect(service.process(key, userId, method, endpoint, body, handler)).rejects.toThrow(
        ConflictException,
      );
      expect(handler).not.toHaveBeenCalled();
    });

    it('throws ConflictException (409) if key exists and status is PROCESSING', async () => {
      const requestHash = service.generateRequestHash(userId, method, endpoint, body);
      const existingRecord = {
        key,
        requestHash,
        status: IdempotencyStatus.PROCESSING,
        response: null,
      } as unknown as IdempotencyKey;

      repository.findOne.mockResolvedValue(existingRecord);

      const handler = jest.fn();
      await expect(service.process(key, userId, method, endpoint, body, handler)).rejects.toThrow(
        ConflictException,
      );
      expect(handler).not.toHaveBeenCalled();
    });

    it('processes transaction, saves completed idempotency record, and returns response when key is new', async () => {
      repository.findOne.mockResolvedValue(null);
      const mockRecord = {
        key,
        requestHash: service.generateRequestHash(userId, method, endpoint, body),
        status: IdempotencyStatus.PROCESSING,
      } as IdempotencyKey;

      repository.create.mockReturnValue(mockRecord);
      repository.save.mockResolvedValue(mockRecord);

      const expectedResponse = { id: 'tx-new', amount: '100.00' };
      const handler = jest.fn().mockResolvedValue(expectedResponse);

      const result = await service.process(key, userId, method, endpoint, body, handler);

      expect(result).toBe(expectedResponse);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledTimes(2); // First PROCESSING, then COMPLETED
      expect(mockRecord.status).toBe(IdempotencyStatus.COMPLETED);
      expect(mockRecord.response).toBe(expectedResponse);
    });

    it('marks record FAILED and rethrows error if handler throws error', async () => {
      repository.findOne.mockResolvedValue(null);
      const mockRecord = {
        key,
        requestHash: service.generateRequestHash(userId, method, endpoint, body),
        status: IdempotencyStatus.PROCESSING,
      } as IdempotencyKey;

      repository.create.mockReturnValue(mockRecord);
      repository.save.mockResolvedValue(mockRecord);

      const handler = jest.fn().mockRejectedValue(new Error('Business validation failed'));

      await expect(service.process(key, userId, method, endpoint, body, handler)).rejects.toThrow(
        'Business validation failed',
      );

      expect(mockRecord.status).toBe(IdempotencyStatus.FAILED);
      expect(repository.save).toHaveBeenCalledWith(mockRecord);
    });
  });
});
