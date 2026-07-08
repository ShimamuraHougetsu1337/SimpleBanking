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
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    // Load environment variables globally — all modules can use ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
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

    // BullMQ setup for Redis Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get<string>('REDIS_PORT', '6379'), 10),
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AccountsModule,
    TransactionsModule,
    AdminModule,
    TasksModule,
    AuditLogsModule,
    ScheduleModule.forRoot(),
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
