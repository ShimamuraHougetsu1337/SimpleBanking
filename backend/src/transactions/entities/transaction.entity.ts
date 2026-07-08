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
  REVERSAL = 'reversal',
}

export enum TransactionStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  PENDING = 'pending',
  REVERSED = 'reversed',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_account_id', type: 'uuid', nullable: true })
  fromAccountId: string | null;

  @ManyToOne(() => Account, (account) => account.outgoingTransactions, {
    nullable: true,
  })
  @JoinColumn({ name: 'from_account_id' })
  fromAccount: Account | null;

  @Column({ name: 'to_account_id', type: 'uuid', nullable: true })
  toAccountId: string | null;

  @ManyToOne(() => Account, (account) => account.incomingTransactions, {
    nullable: true,
  })
  @JoinColumn({ name: 'to_account_id' })
  toAccount: Account | null;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: '0.00' })
  fee: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 18, scale: 2, default: '0.00' })
  totalAmount: string;

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
  idempotencyKey: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId: string | null;

  /**
   * References the original transaction when this is a REVERSAL type.
   * Null for all non-reversal transactions.
   */
  @Column({ name: 'original_transaction_id', type: 'uuid', nullable: true })
  originalTransactionId: string | null;
}
