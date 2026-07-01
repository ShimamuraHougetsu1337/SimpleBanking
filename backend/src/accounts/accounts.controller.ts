import { Controller, Get, Post, Patch, Body, UseGuards, Param, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import { User } from '@/users/entities/user.entity';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateAccountDto } from './dto/create-account.dto';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) { }

  @Get('me')
  async getMyAccounts(@CurrentUser() user: User) {
    return this.accountsService.findByUserId(user.id);
  }

  @Post()
  async createAccount(
    @CurrentUser() user: User,
    @Body() createAccountDto: CreateAccountDto,
  ) {
    return this.accountsService.createAccount(user, createAccountDto);
  }

  @Get('resolve/:accountNumber')
  async resolveAccount(@Param('accountNumber') accountNumber: string) {
    const account = await this.accountsService.findByAccountNumber(accountNumber);
    if (!account) {
      throw new NotFoundException('Destination account not found');
    }
    return {
      accountNumber: account.accountNumber,
      name: account.name,
      ownerName: account.user?.fullName,
    };
  }

  @Get(':id')
  async getAccount(@CurrentUser() user: User, @Param('id') id: string) {
    const account = await this.accountsService.findById(id, user.id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  @Patch(':id')
  async updateAccount(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    try {
      return await this.accountsService.updateAccount(id, user.id, updateAccountDto);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Account not found') {
        throw new NotFoundException('Account not found');
      }
      throw error;
    }
  }
}
