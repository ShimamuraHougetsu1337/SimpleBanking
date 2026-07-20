import { Controller, Get, Post, Body, UseGuards, Query, Headers, BadRequestException, Param } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TransactionsService } from '../services/transactions.service';
import { FeesService } from '../services/fees.service';
import { User } from '@/users/entities/user.entity';
import { TransferDto } from '../dto/transfer.dto';
import { DepositDto } from '../dto/deposit.dto';
import { WithdrawDto } from '../dto/withdraw.dto';
import { GetTransactionsQueryDto } from '../dto/get-transactions-query.dto';
import { CustomerLog } from '@/audit-logs/decorators/customer-log.decorator';
import { CustomerAuditAction } from '@/audit-logs/enums/customer-audit-action.enum';
import { isUUID } from 'class-validator';
import { TransactionRateLimitGuard } from '../guards/transaction-rate-limit.guard';

import { IdempotencyService } from '../services/idempotency.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly feesService: FeesService,
    private readonly idempotencyService: IdempotencyService,
  ) { }

  @Post('transfer')
  @UseGuards(TransactionRateLimitGuard)
  @CustomerLog(CustomerAuditAction.TRANSFER)
  async transfer(
    @CurrentUser() user: User,
    @Body() dto: TransferDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }
    if (!isUUID(idempotencyKey, '4')) {
      throw new BadRequestException('X-Idempotency-Key must be a valid UUID v4');
    }
    return this.idempotencyService.process(
      idempotencyKey,
      user.id,
      'POST',
      '/transactions/transfer',
      dto,
      async () => {
        const tx = await this.transactionsService.transfer(dto, user.id, idempotencyKey);
        return tx as unknown as Record<string, unknown>;
      },
    );
  }

  @Post('deposit')
  @UseGuards(TransactionRateLimitGuard)
  @CustomerLog(CustomerAuditAction.DEPOSIT)
  async deposit(
    @CurrentUser() user: User,
    @Body() dto: DepositDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }
    if (!isUUID(idempotencyKey, '4')) {
      throw new BadRequestException('X-Idempotency-Key must be a valid UUID v4');
    }
    return this.idempotencyService.process(
      idempotencyKey,
      user.id,
      'POST',
      '/transactions/deposit',
      dto,
      async () => {
        const tx = await this.transactionsService.deposit(dto, user.id, idempotencyKey);
        return tx as unknown as Record<string, unknown>;
      },
    );
  }

  @Post('withdraw')
  @UseGuards(TransactionRateLimitGuard)
  @CustomerLog(CustomerAuditAction.WITHDRAW)
  async withdraw(
    @CurrentUser() user: User,
    @Body() dto: WithdrawDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }
    if (!isUUID(idempotencyKey, '4')) {
      throw new BadRequestException('X-Idempotency-Key must be a valid UUID v4');
    }
    return this.idempotencyService.process(
      idempotencyKey,
      user.id,
      'POST',
      '/transactions/withdraw',
      dto,
      async () => {
        const tx = await this.transactionsService.withdraw(dto, user.id, idempotencyKey);
        return tx as unknown as Record<string, unknown>;
      },
    );
  }

  @Get('transfer-fee')
  getTransferFee() {
    return this.feesService.getTransferFee();
  }

  @Post(':id/verify-otp')
  async verifyOtp(
    @Param('id') id: string,
    @Body() dto: { code: string },
    @CurrentUser() user: User,
  ) {
    if (!isUUID(id, '4')) {
      throw new BadRequestException('Transaction ID must be a valid UUID v4');
    }
    if (!dto.code || dto.code.length !== 6) {
      throw new BadRequestException('Mã OTP phải có độ dài đúng 6 chữ số');
    }
    return this.transactionsService.verifyOtp(id, dto.code, user.id);
  }

  @Post(':id/resend-otp')
  async resendOtp(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    if (!isUUID(id, '4')) {
      throw new BadRequestException('Transaction ID must be a valid UUID v4');
    }
    return this.transactionsService.resendOtp(id, user.id);
  }

  @Get()
  async getTransactions(
    @CurrentUser() user: User,
    @Query() query: GetTransactionsQueryDto,
  ) {
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const page = query.page ? parseInt(query.page, 10) : 1;

    // Map flat query params into the filter record expected by the service
    const filter: Record<string, string> = {};
    if (query.search) filter.search = query.search;
    if (query.fromDate) filter.fromDate = query.fromDate;
    if (query.toDate) filter.toDate = query.toDate;

    const { data, total } = await this.transactionsService.getTransactionsForUser(
      user.id,
      page,
      limit,
      query.accountId,
      Object.keys(filter).length > 0 ? filter : undefined,
    );

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
