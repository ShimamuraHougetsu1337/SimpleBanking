import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Account } from '@/accounts/entities/account.entity';

export enum TransactionType {
  TRANSFER = 'transfer',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
}

export enum TransactionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_account_id', type: 'uuid', nullable: true })
  from_account_id: string | null;

  @ManyToOne(() => Account, (account) => account.outgoingTransactions, {
    nullable: true,
  })
  @JoinColumn({ name: 'from_account_id' })
  fromAccount: Account | null;

  @Column({ name: 'to_account_id', type: 'uuid', nullable: true })
  to_account_id: string | null;

  @ManyToOne(() => Account, (account) => account.incomingTransactions, {
    nullable: true,
  })
  @JoinColumn({ name: 'to_account_id' })
  toAccount: Account | null;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.TRANSFER,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ name: 'idempotency_key', length: 64, unique: true, nullable: true })
  idempotency_key: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;
}
