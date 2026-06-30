import { Controller, Get, UseGuards, Param, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import { User } from '@/users/entities/user.entity';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('me')
  async getMyAccounts(@CurrentUser() user: User) {
    return this.accountsService.findByUserId(user.id);
  }

  @Get(':id')
  async getAccount(@CurrentUser() user: User, @Param('id') id: string) {
    const account = await this.accountsService.findById(id, user.id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }
}
