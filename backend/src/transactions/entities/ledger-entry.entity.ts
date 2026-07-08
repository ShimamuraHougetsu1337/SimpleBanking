import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  BeforeUpdate,
} from 'typeorm';
import { Account } from '@/accounts/entities/account.entity';
import { Transaction } from './transaction.entity';

/**
 * Represents a single immutable ledger entry in the double-entry bookkeeping system.
 * Every financial transaction produces at least 2 entries (DEBIT + CREDIT).
 *
 * IMPORTANT: This table is INSERT-ONLY. Never call update() or delete() on this entity.
 * The DB-level trigger in the migration also enforces this constraint.
 */

export enum LedgerEntryType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Index()
  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId: string | null;

  @ManyToOne(() => Transaction, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction | null;

  @Column({ type: 'enum', enum: LedgerEntryType })
  type: LedgerEntryType;

  /** Always stored as a positive number representing the movement amount. */
  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  /** Cached account balance immediately after this entry was applied. */
  @Column({ name: 'balance_after', type: 'numeric', precision: 18, scale: 2 })
  balanceAfter: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @BeforeUpdate()
  preventUpdate() {
    throw new Error('Ledger entries are immutable and cannot be updated.');
  }
}
