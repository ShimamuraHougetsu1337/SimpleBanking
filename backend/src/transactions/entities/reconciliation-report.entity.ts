import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReconciliationStatus {
  OK = 'OK',
  MISMATCH = 'MISMATCH',
}

export interface MismatchDetail {
  accountId: string;
  accountNumber: string;
  cachedBalance: string;
  computedBalance: string;
  difference: string;
}

@Entity('reconciliation_reports')
export class ReconciliationReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz', name: 'checked_at' })
  checkedAt: Date;

  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.OK,
  })
  status: ReconciliationStatus;

  @Column({ name: 'total_accounts', type: 'integer' })
  totalAccounts: number;

  @Column({ name: 'mismatch_count', type: 'integer' })
  mismatchCount: number;

  @Column({ type: 'jsonb', nullable: true })
  details: MismatchDetail[] | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
