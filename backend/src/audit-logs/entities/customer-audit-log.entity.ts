import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
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

  @Column({ name: 'entity', type: 'varchar', length: 100, nullable: true })
  entity: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ name: 'before_data', type: 'jsonb', nullable: true })
  beforeData: Record<string, unknown> | null;

  @Column({ name: 'after_data', type: 'jsonb', nullable: true })
  afterData: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Expose()
  get metadata(): Record<string, unknown> {
    return {
      timestamp: this.createdAt?.toISOString(),
      action: this.action,
      actor: {
        type: 'CUSTOMER',
        id: this.customerId,
      },
      context: {
        ip_address: this.ipAddress,
        user_agent: this.userAgent,
      },
      data_changes: {
        old_data: this.beforeData ?? {},
        new_data: this.afterData ?? {},
      },
      outcome: {
        status: this.status,
        error_code: this.status === AuditStatus.FAILED ? '500' : null,
        error_message: this.status === AuditStatus.FAILED ? (this.afterData?.errorMessage || 'Internal Server Error') : null,
      },
    };
  }
}
