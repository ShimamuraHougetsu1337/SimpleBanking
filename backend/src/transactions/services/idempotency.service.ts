import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyKey, IdempotencyStatus } from '../entities/idempotency-key.entity';
import * as crypto from 'crypto';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyKeyRepository: Repository<IdempotencyKey>,
  ) {}

  /**
   * Generates a deterministic SHA-256 hash from user ID, HTTP method, endpoint path, and payload body.
   */
  generateRequestHash(userId: string, method: string, endpoint: string, body: unknown): string {
    const sortedPayload = this.sortObjectKeys(body);
    const payloadString = JSON.stringify(sortedPayload);
    const rawData = `${userId}:${method.toUpperCase()}:${endpoint}:${payloadString}`;
    return crypto.createHash('sha256').update(rawData).digest('hex');
  }

  /**
   * Recursively sorts object keys to ensure payload JSON string representation is deterministic.
   */
  private sortObjectKeys(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    }
    const recordObj = obj as Record<string, unknown>;
    const sortedObj: Record<string, unknown> = {};
    const keys = Object.keys(recordObj).sort();
    for (const key of keys) {
      sortedObj[key] = this.sortObjectKeys(recordObj[key]);
    }
    return sortedObj;
  }

  /**
   * Processes an incoming request with idempotency protection.
   * If key exists with matching hash, returns cached response.
   * If key exists with different hash, throws 409 Conflict.
   * If key is processing, throws 409 Conflict.
   * Otherwise, executes handler, caches response, and returns result.
   */
  async process<T extends Record<string, unknown>>(
    key: string,
    userId: string,
    method: string,
    endpoint: string,
    body: unknown,
    handler: () => Promise<T>,
    statusCode: number = 200,
  ): Promise<T> {
    const requestHash = this.generateRequestHash(userId, method, endpoint, body);

    const existingKey = await this.idempotencyKeyRepository.findOne({ where: { key } });

    if (existingKey) {
      if (existingKey.requestHash !== requestHash) {
        throw new ConflictException('Yêu cầu không khớp với payload của Idempotency-Key đã sử dụng');
      }

      if (existingKey.status === IdempotencyStatus.COMPLETED) {
        return existingKey.response as T;
      }

      if (existingKey.status === IdempotencyStatus.PROCESSING) {
        throw new ConflictException('Giao dịch với Idempotency-Key này đang được xử lý');
      }
    }

    // Attempt to insert processing record
    let idempotencyRecord: IdempotencyKey;
    try {
      idempotencyRecord = this.idempotencyKeyRepository.create({
        key,
        requestHash,
        status: IdempotencyStatus.PROCESSING,
      });
      idempotencyRecord = await this.idempotencyKeyRepository.save(idempotencyRecord);
    } catch (err: unknown) {
      // Handle potential race condition on initial key creation
      const recheckedKey = await this.idempotencyKeyRepository.findOne({ where: { key } });
      if (recheckedKey) {
        if (recheckedKey.requestHash !== requestHash) {
          throw new ConflictException('Yêu cầu không khớp với payload của Idempotency-Key đã sử dụng');
        }
        if (recheckedKey.status === IdempotencyStatus.COMPLETED) {
          return recheckedKey.response as T;
        }
        throw new ConflictException('Giao dịch với Idempotency-Key này đang được xử lý');
      }
      throw err;
    }

    try {
      const responseData = await handler();
      idempotencyRecord.response = responseData;
      idempotencyRecord.statusCode = statusCode;
      idempotencyRecord.status = IdempotencyStatus.COMPLETED;
      await this.idempotencyKeyRepository.save(idempotencyRecord);
      return responseData;
    } catch (error) {
      idempotencyRecord.status = IdempotencyStatus.FAILED;
      await this.idempotencyKeyRepository.save(idempotencyRecord);
      throw error;
    }
  }
}
