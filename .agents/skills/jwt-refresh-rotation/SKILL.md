---
name: jwt-refresh-rotation
description: >
  Set up JWT authentication with Refresh Token Rotation in NestJS.
  Trigger when: setting up auth, JWT strategy, guards, login, logout,
  refresh token, token rotation, reuse detection, force logout.
triggers:
  - "JWT"
  - "authentication"
  - "refresh token"
  - "token rotation"
  - "auth setup"
  - "login"
  - "logout"
  - "JwtStrategy"
  - "JwtAuthGuard"
  - "reuse detection"
  - "force logout"
---

# Skill: JWT + Refresh Token Rotation — NestJS Pattern

## When to Use This Skill

Use this skill when configuring or editing attributes of the authentication layers:
- User login / Registration flows.
- JWT Access token validations.
- Refresh token rotation logic.
- Route request guard implementations.

## Package Dependencies Installation

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt crypto
npm install -D @types/passport-jwt @types/bcrypt
```

## Auth Module File Structure

```
src/auth/
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   └── refresh-token.dto.ts
├── entities/
│   └── refresh-token.entity.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── local-auth.guard.ts
├── strategies/
│   └── jwt.strategy.ts
├── auth.controller.ts
├── auth.service.ts
└── auth.module.ts
```

## RefreshToken Entity Mapping

```typescript
// entities/refresh-token.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { User } from '@/users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Stored as SHA-256 hash — NEVER store plaintext values
  @Column({ name: 'token_hash', unique: true })
  token_hash: string;

  @Column({ name: 'is_revoked', default: false })
  is_revoked: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expires_at: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;
}
```

## JWT Strategy Implementation

```typescript
// strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '@/users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Check database to ensure user exists and is not locked
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status === 'locked') {
      throw new UnauthorizedException();
    }
    return user; // Attached to request.user
  }
}
```

## JWT Auth Guard Definition

```typescript
// guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

## AuthService — Login & Refresh Token Rotation

```typescript
// auth.service.ts
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User } from '@/users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '@/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async generateTokenPair(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const rawRefreshToken = crypto.randomUUID();
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.refreshTokenRepository.save({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      is_revoked: false,
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Incorrect email or password');

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) throw new UnauthorizedException('Incorrect email or password');

    if (user.status === 'locked') {
      throw new ForbiddenException('Your account is locked');
    }

    return this.generateTokenPair(user);
  }

  async refreshTokens(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token_hash: tokenHash },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid token');
    }

    // === REUSE DETECTION ===
    if (storedToken.is_revoked) {
      // Token already used — suspected malicious access attempt.
      // Immediately revoke all existing refresh tokens for this user.
      await this.refreshTokenRepository.update(
        { user_id: storedToken.user_id },
        { is_revoked: true },
      );
      throw new UnauthorizedException(
        'Abnormal session activity. Please log in again.',
      );
    }

    if (storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    // Invalidate old token immediately
    await this.refreshTokenRepository.update(storedToken.id, { is_revoked: true });

    // Generate new token pair
    return this.generateTokenPair(storedToken.user);
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.refreshTokenRepository.update(
      { token_hash: tokenHash },
      { is_revoked: true },
    );
  }

  async register(registerDto: RegisterDto) {
    const password_hash = await bcrypt.hash(registerDto.password, 12);
    const user = await this.usersService.create({
      ...registerDto,
      password_hash,
    });
    // Automatically initialize a bank account for the newly registered user
    await this.accountsService.create(user.id);
    return user;
  }
}
```

## Auth Controller Implementation

```typescript
// auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() dto: LoginDto) {
    const { accessToken, refreshToken } = await this.authService.login(dto.email, dto.password);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const { accessToken, refreshToken } = await this.authService.refreshTokens(dto.refresh_token);
    return { access_token: accessToken, refresh_token: refreshToken, token_type: 'Bearer', expires_in: 900 };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user session' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refresh_token);
    return { message: 'Logged out successfully' };
  }
}
```

## Auth Module Settings

```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([RefreshToken]),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

## Security Integration Checklist

- [ ] Save SHA-256 hashed refresh tokens in the database, never raw strings.
- [ ] Invalidate the used refresh token (`is_revoked = true`) BEFORE returning the newly generated token pair.
- [ ] Implement user refresh token reuse checks, setting all user active tokens to invalid.
- [ ] Enforce Access Token TTL to 15 minutes, and Refresh Token TTL to 7 days.
- [ ] Ensure `password_hash` is excluded from the serialized user output using the `@Exclude()` decorator.
- [ ] Verify `ClassSerializerInterceptor` is registered globally.
- [ ] Verify `JwtStrategy` is registered under auth module providers.
