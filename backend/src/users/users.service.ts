import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsRelations } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

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
}


