import { Module } from '@nestjs/common';
import { UsersModule } from '@/users/users.module';
import { AccountsModule } from '@/accounts/accounts.module';
import { TransactionsModule } from '@/transactions/transactions.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [UsersModule, AccountsModule, TransactionsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule { }
