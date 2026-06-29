import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Account } from '@/accounts/entities/account.entity';
import { RefreshToken } from '@/auth/entities/refresh-token.entity';

/** Enum representing user authorization roles. */
export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
}

/** Enum representing user account lifecycle status. */
export enum UserStatus {
  ACTIVE = 'active',
  LOCKED = 'locked',
}

/**
 * Represents the `users` table.
 * Maps exactly to the schema defined in DATA_MODEL.md.
 *
 * IMPORTANT: password_hash is excluded from all serialized responses
 * via @Exclude() + ClassSerializerInterceptor.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', length: 100 })
  full_name: string;

  @Column({ length: 255, unique: true })
  email: string;

  /** Stored as bcrypt hash (cost ≥ 10). Never exposed in API responses. */
  @Exclude()
  @Column({ name: 'password_hash', length: 255 })
  password_hash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;

  /**
   * Lazy relations — declared here so TypeORM can build the schema.
   * Actual relation entities are imported only when needed to avoid circular deps.
   */

  @OneToMany(() => Account, (account) => account.user)
  accounts: Account[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];
}
