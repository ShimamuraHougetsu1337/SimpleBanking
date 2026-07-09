import { Module } from '@nestjs/common';
import { UsersModule } from '@/users/users.module';
import { AccountsModule } from '@/accounts/accounts.module';
import { TransactionsModule } from '@/transactions/transactions.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SystemSettingsModule } from '@/system-settings/system-settings.module';

@Module({
  imports: [SystemSettingsModule, UsersModule, AccountsModule, TransactionsModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [SystemSettingsModule],
})
export class AdminModule { }
