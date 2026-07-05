import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TransactionsService } from './transactions.service';
import { User } from '@/users/entities/user.entity';
import { TransferDto } from './dto/transfer.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { GetTransactionsQueryDto } from './dto/get-transactions-query.dto';
import { CustomerLog } from '@/audit-logs/decorators/customer-log.decorator';
import { CustomerAuditAction } from '@/audit-logs/enums/customer-audit-action.enum';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) { }

  @Post('transfer')
  @CustomerLog(CustomerAuditAction.TRANSFER)
  async transfer(@CurrentUser() user: User, @Body() dto: TransferDto) {
    return this.transactionsService.transfer(dto, user.id);
  }

  @Post('deposit')
  @CustomerLog(CustomerAuditAction.DEPOSIT)
  async deposit(@CurrentUser() user: User, @Body() dto: DepositDto) {
    return this.transactionsService.deposit(dto, user.id);
  }

  @Post('withdraw')
  @CustomerLog(CustomerAuditAction.WITHDRAW)
  async withdraw(@CurrentUser() user: User, @Body() dto: WithdrawDto) {
    return this.transactionsService.withdraw(dto, user.id);
  }

  @Get('transfer-fee')
  async getTransferFee() {
    return this.transactionsService.getTransferFee();
  }

  @Get()
  async getTransactions(
    @CurrentUser() user: User,
    @Query() query: GetTransactionsQueryDto,
  ) {
    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    // Map flat query params into the filter record expected by the service
    const filter: Record<string, string> = {};
    if (query.search) filter.search = query.search;
    if (query.fromDate) filter.fromDate = query.fromDate;
    if (query.toDate) filter.toDate = query.toDate;

    const data = await this.transactionsService.getTransactionsForUser(
      user.id,
      limit,
      query.accountId,
      Object.keys(filter).length > 0 ? filter : undefined,
    );

    return {
      data,
      meta: {
        page: 1,
        limit,
        total: data.length,
        totalPages: 1,
      },
    };
  }
}
