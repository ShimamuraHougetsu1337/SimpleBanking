import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User, UserStatus } from '@/users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '@/users/users.service';
import { AccountsService } from '@/accounts/accounts.service';
import { RegisterDto } from './dto/register.dto';
import ms, { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly accountsService: AccountsService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async generateTokenPair(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessTokenExpiresIn = (this.configService.get<string>(
      'ACCESS_TOKEN_EXPIRES_IN',
    ) || '15m') as StringValue;

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: accessTokenExpiresIn,
    });

    const rawRefreshToken = crypto.randomUUID();
    const tokenHash = this.hashToken(rawRefreshToken);

    const refreshExpiresInStr = (this.configService.get<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
    ) || '7d') as StringValue;
    const refreshExpiresInMs = ms(refreshExpiresInStr);
    const expiresAt = new Date(Date.now() + refreshExpiresInMs);

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash: tokenHash,
      expiresAt: expiresAt,
      isRevoked: false,
    });

    return { accessToken, refreshToken: rawRefreshToken, user };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Incorrect email or password');

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid)
      throw new UnauthorizedException('Incorrect email or password');

    if (user.status === UserStatus.LOCKED) {
      throw new ForbiddenException('Your account is locked');
    }

    return this.generateTokenPair(user);
  }

  async refreshTokens(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash: tokenHash },
      relations: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid token');
    }

    // === REUSE DETECTION ===
    if (storedToken.isRevoked) {
      // Token already used — suspected malicious access attempt.
      // Immediately revoke all existing refresh tokens for this user.
      await this.refreshTokenRepository.update(
        { userId: storedToken.userId },
        { isRevoked: true },
      );
      throw new UnauthorizedException(
        'Abnormal session activity. Please log in again.',
      );
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    // Invalidate old token immediately
    await this.refreshTokenRepository.update(storedToken.id, {
      isRevoked: true,
    });

    // Generate new token pair
    return this.generateTokenPair(storedToken.user);
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.refreshTokenRepository.update(
      { tokenHash: tokenHash },
      { isRevoked: true },
    );
  }

  async register(registerDto: RegisterDto) {
    // UsersService.create handles bcrypt hashing internally.
    const user = await this.usersService.create(registerDto);
    
    // Automatically create a default account for the new user
    await this.accountsService.createDefaultAccount(user);
    
    return user;
  }
}
