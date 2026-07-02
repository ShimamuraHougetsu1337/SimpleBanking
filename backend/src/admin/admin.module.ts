import { Module } from '@nestjs/common';
import { UsersModule } from '@/users/users.module';
import { AccountsModule } from '@/accounts/accounts.module';
import { TransactionsModule } from '@/transactions/transactions.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import { SystemSettingsService } from './system-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting]), UsersModule, AccountsModule, TransactionsModule],
  controllers: [AdminController],
  providers: [AdminService, SystemSettingsService],
  exports: [SystemSettingsService],
})
export class AdminModule { }
