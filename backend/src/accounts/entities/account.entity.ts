import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { Transaction } from '@/transactions/entities/transaction.entity';

export enum AccountStatus {
  ACTIVE = 'active',
  LOCKED = 'locked',
}

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.accounts, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'account_number', length: 20, unique: true })
  accountNumber: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0.0 })
  balance: string;

  @Column({ length: 3, default: 'VND' })
  currency: string;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  status: AccountStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(
    () => Transaction,
    (transaction: Transaction) => transaction.fromAccount,
  )
  outgoingTransactions: Transaction[];

  @OneToMany(
    () => Transaction,
    (transaction: Transaction) => transaction.toAccount,
  )
  incomingTransactions: Transaction[];
}
