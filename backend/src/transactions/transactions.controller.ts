import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TransactionsService } from './transactions.service';
import { User } from '@/users/entities/user.entity';
import { TransferDto } from './dto/transfer.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) { }

  @Post('transfer')
  async transfer(@CurrentUser() user: User, @Body() dto: TransferDto) {
    return this.transactionsService.transfer(dto, user.id);
  }

  @Post('deposit')
  async deposit(@CurrentUser() user: User, @Body() dto: DepositDto) {
    return this.transactionsService.deposit(dto, user.id);
  }

  @Post('withdraw')
  async withdraw(@CurrentUser() user: User, @Body() dto: WithdrawDto) {
    return this.transactionsService.withdraw(dto, user.id);
  }

  @Get()
  async getTransactions(
    @CurrentUser() user: User,
    @Query('limit') limitStr?: string,
    @Query('accountId') accountId?: string,
    @Query('filter') filter?: Record<string, string>,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    const data = await this.transactionsService.getTransactionsForUser(user.id, limit, accountId, filter);
    return {
      data,
      meta: {
        page: 1,
        limit,
        total: data.length, // Naive implementation for MVP
        totalPages: 1,
      }
    };
  }
}
