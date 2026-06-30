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
import { StringValue } from 'ms';
import { hashToken, calculateRefreshTokenExpiresAt } from './auth.utils';
import {
  DEFAULT_ACCESS_TOKEN_EXPIRES_IN,
  DEFAULT_REFRESH_TOKEN_EXPIRES_IN,
} from './auth.constants';

// Error messages (strictly local to this file)
const ERROR_INCORRECT_CREDENTIALS = 'Incorrect email or password';
const ERROR_ACCOUNT_LOCKED = 'Your account is locked';
const ERROR_INVALID_TOKEN = 'Invalid token';
const ERROR_SESSION_EXPIRED = 'Session expired';
const ERROR_ABNORMAL_SESSION = 'Abnormal session activity. Please log in again.';

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

  /**
   * Helper to retrieve access token expiration from configuration.
   */
  private getAccessTokenExpiresIn(): StringValue {
    return (this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN') ||
      DEFAULT_ACCESS_TOKEN_EXPIRES_IN) as StringValue;
  }

  /**
   * Helper to calculate refresh token expiration date.
   */
  private getRefreshTokenExpiresAt(): Date {
    const refreshExpiresInStr =
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') ||
      DEFAULT_REFRESH_TOKEN_EXPIRES_IN;
    return calculateRefreshTokenExpiresAt(refreshExpiresInStr);
  }

  /**
   * Signs a JWT access token containing sub, email, and role claims.
   */
  private signAccessToken(user: User, expiresIn: StringValue): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn,
    });
  }

  /**
   * Generates a raw refresh token, hashes it, saves the hash and metadata to the database,
   * and returns the raw token.
   */
  private async createAndSaveRefreshToken(userId: string, expiresAt: Date): Promise<string> {
    const rawRefreshToken = crypto.randomUUID();
    const tokenHash = hashToken(rawRefreshToken);

    await this.refreshTokenRepository.save({
      userId,
      tokenHash,
      expiresAt,
      isRevoked: false,
    });

    return rawRefreshToken;
  }

  /**
   * Generates a new access token and a refresh token for the user.
   */
  private async generateTokenPair(user: User) {
    const accessTokenExpiresIn = this.getAccessTokenExpiresIn();
    const accessToken = this.signAccessToken(user, accessTokenExpiresIn);

    const expiresAt = this.getRefreshTokenExpiresAt();
    const refreshToken = await this.createAndSaveRefreshToken(user.id, expiresAt);

    return { accessToken, refreshToken, user };
  }

  /**
   * Validates user credentials and generates a token pair on success.
   */
  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException(ERROR_INCORRECT_CREDENTIALS);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(ERROR_INCORRECT_CREDENTIALS);
    }

    if (user.status === UserStatus.LOCKED) {
      throw new ForbiddenException(ERROR_ACCOUNT_LOCKED);
    }

    return this.generateTokenPair(user);
  }

  /**
   * Rotates a refresh token: revokes the old one, validates it, and generates a new pair.
   * Includes reuse detection to revoke all user sessions in case of theft.
   */
  async refreshTokens(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException(ERROR_INVALID_TOKEN);
    }

    // === REUSE DETECTION ===
    if (storedToken.isRevoked) {
      // Token already used — suspected malicious access attempt.
      // Immediately revoke all existing refresh tokens for this user.
      await this.refreshTokenRepository.update(
        { userId: storedToken.userId },
        { isRevoked: true },
      );
      throw new UnauthorizedException(ERROR_ABNORMAL_SESSION);
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException(ERROR_SESSION_EXPIRED);
    }

    // Invalidate old token immediately
    await this.refreshTokenRepository.update(storedToken.id, {
      isRevoked: true,
    });

    // Generate new token pair
    return this.generateTokenPair(storedToken.user);
  }

  /**
   * Revokes the provided refresh token.
   */
  async logout(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    await this.refreshTokenRepository.update(
      { tokenHash },
      { isRevoked: true },
    );
  }

  /**
   * Registers a new user and automatically configures a default bank account.
   */
  async register(registerDto: RegisterDto) {
    // UsersService.create handles bcrypt hashing internally.
    const user = await this.usersService.create(registerDto);
    
    // Automatically create a default account for the new user
    await this.accountsService.createDefaultAccount(user);
    
    return user;
  }
}
