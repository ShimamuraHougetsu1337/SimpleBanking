import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Otp } from '../entities/otp.entity';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { Account } from '@/accounts/entities/account.entity';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  /**
   * Generates a new 6-digit OTP, hashes it, and saves it in the database.
   */
  async createOtp(transactionId: string): Promise<string> {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(otpCode).digest('hex');

    // Upsert the OTP record
    let otp = await this.otpRepository.findOne({ where: { transactionId } });
    if (!otp) {
      otp = this.otpRepository.create({ transactionId });
    }
    otp.codeHash = codeHash;
    otp.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    otp.attempts = 0;
    otp.isVerified = false;

    await this.otpRepository.save(otp);
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

    const otp = await this.otpRepository.findOne({ where: { transactionId, isVerified: false } });
    if (!otp) {
      throw new BadRequestException('OTP not found or already verified');
    }

    if (otp.expiresAt < new Date()) {
      tx.status = TransactionStatus.FAILED;
      await this.transactionRepository.save(tx);
      throw new BadRequestException('OTP has expired');
    }

    if (otp.attempts >= 3) {
      tx.status = TransactionStatus.FAILED;
      await this.transactionRepository.save(tx);
      throw new BadRequestException('Too many incorrect OTP attempts. Transaction failed.');
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (otp.codeHash !== codeHash) {
      otp.attempts += 1;
      await this.otpRepository.save(otp);

      if (otp.attempts >= 3) {
        tx.status = TransactionStatus.FAILED;
        await this.transactionRepository.save(tx);
        throw new BadRequestException('Incorrect OTP. Maximum attempts reached. Transaction failed.');
      }
      throw new BadRequestException(`Incorrect OTP. ${3 - otp.attempts} attempts remaining.`);
    }

    // OTP is correct! Mark it as verified
    otp.isVerified = true;
    await this.otpRepository.save(otp);
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

    await this.createOtp(transactionId);
    return { message: 'Mã OTP mới đã được gửi.' };
  }
}
