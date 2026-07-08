import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsRelations } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserHistoryService } from './services/user-history.service';

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
  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    user.status = status;
    return this.userRepository.save(user);
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
  ): Promise<{ data: User[]; total: number }> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.accounts', 'account')
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

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
    
    return this.userRepository.save(user);
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
    await this.userRepository.save(user);
  }
}


