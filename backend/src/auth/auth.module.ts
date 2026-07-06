import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '@/users/users.module';
import { AccountsModule } from '@/accounts/accounts.module';
import { AuditLogsModule } from '@/audit-logs/audit-logs.module';
import { LruCacheThrottlerStorage } from './storage/lru-cache-throttler.storage';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';

/** Maximum login attempts within the rate limit window */
const LOGIN_RATE_LIMIT = 5;

/** Rate limit window in milliseconds (1 minute) */
const LOGIN_RATE_LIMIT_TTL_MS = 60 * 1000;

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn:
            configService.get<string>('ACCESS_TOKEN_EXPIRES_IN') || '15m',
        } as JwtSignOptions,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([RefreshToken]),
    UsersModule,
    AccountsModule,
    AuditLogsModule,

    // ThrottlerModule scoped to AuthModule — uses LRU Cache as the storage backend.
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'login',
          ttl: LOGIN_RATE_LIMIT_TTL_MS,
          limit: LOGIN_RATE_LIMIT,
          blockDuration: LOGIN_RATE_LIMIT_TTL_MS,
        },
      ],
      storage: new LruCacheThrottlerStorage(),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LoginRateLimitGuard,
  ],
  exports: [AuthService],
})
export class AuthModule { }
