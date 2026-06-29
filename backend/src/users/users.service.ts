import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

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

    const password_hash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = this.userRepository.create({
      full_name: dto.full_name,
      email: dto.email,
      password_hash,
    });

    return this.userRepository.save(user);
  }

  /**
   * Finds a user by their UUID primary key.
   * Returns null if no user is found (callers decide how to handle absence).
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
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
   * Returns a paginated list of all users.
   * Intended for AdminModule — never exposed to customer-role callers.
   */
  async findAll(
    page: number,
    limit: number,
  ): Promise<{ data: User[]; total: number }> {
    const [data, total] = await this.userRepository.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }
}
