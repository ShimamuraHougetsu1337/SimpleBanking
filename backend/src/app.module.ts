import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AdminModule } from './admin/admin.module';
import { TasksModule } from './tasks/tasks.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import databaseConfig from './config/database.config';
import throttlerConfig from './config/throttler.config';

@Module({
  imports: [
    // Load environment variables globally — all modules can use ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, throttlerConfig],
      // Allows the app to start without a .env file in production (env vars set externally)
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),

    // Async TypeORM setup — reads from the registered 'database' config namespace
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get<TypeOrmModuleOptions>('database'),
      }),
      inject: [ConfigService],
    }),

    AuthModule,

    UsersModule,
    AccountsModule,
    TransactionsModule,
    AdminModule,
    TasksModule,
    AuditLogsModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<ThrottlerModuleOptions>('throttler') as ThrottlerModuleOptions,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
  ],
})
export class AppModule { }
