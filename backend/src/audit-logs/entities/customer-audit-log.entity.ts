import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CustomerAuditAction } from '../enums/customer-audit-action.enum';
import { AuditStatus } from '../enums/audit-status.enum';
import { Transaction } from '@/transactions/entities/transaction.entity';

@Entity('customer_audit_logs')
export class CustomerAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: true })
  customerName: string | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 255, nullable: true })
  customerEmail: string | null;

  @Column({ type: 'enum', enum: CustomerAuditAction })
  action: CustomerAuditAction;

  @Column({ type: 'enum', enum: AuditStatus, default: AuditStatus.SUCCESS })
  status: AuditStatus;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId: string | null;

  @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
