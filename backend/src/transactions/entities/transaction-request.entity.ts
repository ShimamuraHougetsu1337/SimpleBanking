import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Account } from '@/accounts/entities/account.entity';
import { User } from '@/users/entities/user.entity';

export enum TransactionRequestType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
}

export enum TransactionRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  AUTO_APPROVED = 'auto_approved',
}

@Entity('transaction_requests')
export class TransactionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({
    type: 'enum',
    enum: TransactionRequestType,
  })
  type: TransactionRequestType;

  @Column({
    type: 'enum',
    enum: TransactionRequestStatus,
    default: TransactionRequestStatus.PENDING,
  })
  status: TransactionRequestStatus;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ name: 'idempotency_key', length: 64, unique: true, nullable: true })
  idempotencyKey: string;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'approved_by_id', type: 'uuid', nullable: true })
  approvedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
