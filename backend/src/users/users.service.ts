import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, FindOptionsRelations, OptimisticLockVersionMismatchError, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, UserStatus, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserHistoryService } from './services/user-history.service';
import { SystemAccount } from '@/common/enums/system-account.enum';
import { AppEvent } from '@/common/enums/app-event.enum';
import { SystemSetting } from '@/system-settings/entities/system-setting.entity';

/** bcrypt work factor — min 10 as specified in DATA_MODEL.md */
const BCRYPT_SALT_ROUNDS = 10;

/**
 * UsersService — core user data operations.
 * Consumed by AuthModule (login, register) and AdminModule (list, status patch).
 * All business logic lives here; the controller is kept thin.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userHistoryService: UserHistoryService,
    private readonly eventEmitter: EventEmitter2,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

  /**
   * Creates a new user, hashing the plain-text password before persisting.
   * Throws ConflictException if the email is already registered.
   */
  async create(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = this.userRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      role: 'role' in dto ? (dto as { role?: UserRole }).role : undefined,
    });

    return this.userRepository.save(user);
  }

  async findById(id: string, relations?: FindOptionsRelations<User>): Promise<User | null> {
    return this.userRepository.findOne({ where: { id }, relations });
  }

  /**
   * Finds a user by email address.
   * Used by AuthService to look up a user during the login flow.
   * Returns null if not found.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Updates a user's status (active / locked).
   * Used by AdminService — enforces that admins cannot lock themselves
   * at the service level as a safeguard (AdminService also validates this).
   */
  async updateStatus(id: string, status: UserStatus, changedById: string | null = null): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    if (user.email === (SystemAccount.EMAIL as string)) {
      throw new BadRequestException('Không được phép khóa hoặc thay đổi trạng thái của tài khoản hệ thống');
    }

    if (user.status !== status) {
      // Record user status change history
      await this.userHistoryService.record(
        id,
        changedById,
        'status',
        user.status,
        status,
      );
    }

    user.status = status;
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException(
          'Thông tin người dùng đã được cập nhật bởi một phiên làm việc khác. Vui lòng tải lại trang.',
        );
      }
      throw error;
    }
  }

  /**
   * Returns a paginated list of all users, with optional search and status filtering.
   * Intended for AdminModule — never exposed to customer-role callers.
   */
  async findAll(
    page: number,
    limit: number,
    search?: string,
    status?: UserStatus,
    includeDeleted: boolean = false,
  ): Promise<{ data: User[]; total: number }> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.accounts', 'account')
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.fullName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async countAll(): Promise<number> {
    return this.userRepository.count();
  }

  async countStatus(status: UserStatus): Promise<number> {
    return this.userRepository.count({ where: { status } });
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    // Ghi lại lịch sử các trường nhạy cảm
    for (const field of ['fullName', 'email', 'phoneNumber'] as const) {
      if (dto[field] !== undefined && dto[field] !== user[field]) {
        await this.userHistoryService.record(
          id,
          id, // Khách hàng tự đổi (người đổi = chính họ)
          field,
          user[field] ?? null,
          dto[field] ?? null,
        );
      }
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException(
          'Thông tin người dùng đã được cập nhật bởi một phiên làm việc khác. Vui lòng tải lại trang.',
        );
      }
      throw error;
    }
  }

  async changePassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new ConflictException('Incorrect old password');
    }
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    try {
      await this.userRepository.save(user);
      // Emit event to revoke all refresh tokens for the user upon password change and await its resolution
      await this.eventEmitter.emitAsync(AppEvent.USER_PASSWORD_CHANGED, { userId: id });
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException(
          'Thông tin người dùng đã được cập nhật bởi một phiên làm việc khác. Vui lòng tải lại trang.',
        );
      }
      throw error;
    }
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    if (user.email === (SystemAccount.EMAIL as string)) {
      throw new BadRequestException('Không được phép xóa tài khoản hệ thống');
    }

    await this.userRepository.softDelete(id);
  }

  /**
   * Increments failed login attempts for a user.
   * Locks the account temporarily for a specified duration if maximum attempts are reached.
   */
  async incrementFailedAttempts(user: User): Promise<User> {
    const maxAttemptsSetting = await this.dataSource
      .getRepository(SystemSetting)
      .findOne({ where: { settingKey: 'max_login_failed_attempts' } });
    const lockoutDurationSetting = await this.dataSource
      .getRepository(SystemSetting)
      .findOne({ where: { settingKey: 'login_lockout_duration_minutes' } });

    const maxAttempts = maxAttemptsSetting ? parseInt(maxAttemptsSetting.settingValue, 10) : 5;
    const lockoutMinutes = lockoutDurationSetting ? parseInt(lockoutDurationSetting.settingValue, 10) : 15;

    user.failedAttempts = (user.failedAttempts || 0) + 1;
    if (user.failedAttempts >= maxAttempts) {
      user.status = UserStatus.LOCKED;
      user.lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    }
    return this.userRepository.save(user);
  }

  /**
   * Resets failed login attempts and unlocks a temporarily locked user account.
   */
  async resetFailedAttempts(user: User): Promise<User> {
    user.failedAttempts = 0;
    user.lockoutUntil = null;
    user.status = UserStatus.ACTIVE;
    return this.userRepository.save(user);
  }
}


