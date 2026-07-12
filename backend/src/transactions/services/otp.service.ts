import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { LRUCache } from 'lru-cache';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { Account } from '@/accounts/entities/account.entity';
import { User } from '@/users/entities/user.entity';

interface OtpCacheEntry {
  codeHash: string;
  attempts: number;
}

@Injectable()
export class OtpService {
  private readonly cache = new LRUCache<string, OtpCacheEntry>({
    max: 10000,
    ttl: 5 * 60 * 1000, // 5 minutes TTL
  });

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Generates a new 6-digit OTP, hashes it, and saves it in the local RAM cache.
   */
  createOtp(transactionId: string): string {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(otpCode).digest('hex');

    this.cache.set(transactionId, { codeHash, attempts: 0 });
    console.log(`[OTP DEBUG] Generated OTP for transaction ${transactionId}: ${otpCode}`);

    return otpCode;
  }

  /**
   * Verifies the OTP code for a transaction, handles expiration and retry limits.
   */
  async verifyOtp(transactionId: string, code: string, userId: string): Promise<void> {
    const tx = await this.transactionRepository.findOne({ where: { id: transactionId } });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    if (tx.status !== TransactionStatus.PENDING_OTP) {
      throw new BadRequestException('Transaction is not in PENDING_OTP status');
    }

    if (!tx.fromAccountId) {
      throw new BadRequestException('Source account ID is missing');
    }

    const fromAccount = await this.accountRepository.findOne({ where: { id: tx.fromAccountId } });
    if (!fromAccount || fromAccount.userId !== userId) {
      throw new ForbiddenException('You are not authorized to verify this transaction');
    }

    const otp = this.cache.get(transactionId);
    if (!otp) {
      throw new BadRequestException('OTP not found or already verified or expired');
    }

    if (otp.attempts >= 3) {
      this.cache.delete(transactionId);
      tx.status = TransactionStatus.FAILED;
      await this.transactionRepository.save(tx);
      if (fromAccount) {
        await this.userRepository.update(fromAccount.userId, { isOtpBlocked: true });
      }
      throw new BadRequestException('Too many incorrect OTP attempts. Transaction failed. OTP has been blocked.');
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (otp.codeHash !== codeHash) {
      otp.attempts += 1;

      if (otp.attempts >= 3) {
        this.cache.delete(transactionId);
        tx.status = TransactionStatus.FAILED;
        await this.transactionRepository.save(tx);
        if (fromAccount) {
          await this.userRepository.update(fromAccount.userId, { isOtpBlocked: true });
        }
        throw new BadRequestException('Incorrect OTP. Maximum attempts reached. Transaction failed. OTP has been blocked.');
      }

      // Preserve the remaining TTL on update
      const remainingTtl = this.cache.getRemainingTTL(transactionId);
      this.cache.set(transactionId, otp, { ttl: remainingTtl > 0 ? remainingTtl : undefined });

      throw new BadRequestException(`Incorrect OTP. ${3 - otp.attempts} attempts remaining.`);
    }

    // OTP is correct! Delete from cache to consume it
    this.cache.delete(transactionId);
  }

  /**
   * Resends a new OTP for a transaction.
   */
  async resendOtp(transactionId: string, userId: string): Promise<{ message: string }> {
    const tx = await this.transactionRepository.findOne({ where: { id: transactionId } });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    if (tx.status !== TransactionStatus.PENDING_OTP) {
      throw new BadRequestException('Transaction is not in PENDING_OTP status');
    }

    if (!tx.fromAccountId) {
      throw new BadRequestException('Source account ID is missing');
    }

    const fromAccount = await this.accountRepository.findOne({ where: { id: tx.fromAccountId } });
    if (!fromAccount || fromAccount.userId !== userId) {
      throw new ForbiddenException('You are not authorized to resend OTP for this transaction');
    }

    this.createOtp(transactionId);
    return { message: 'Mã OTP mới đã được gửi.' };
  }
}
