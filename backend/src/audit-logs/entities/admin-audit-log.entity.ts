import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { AdminAuditAction } from '../enums/admin-audit-action.enum';
import { AuditStatus } from '../enums/audit-status.enum';

@Entity('admin_audit_logs')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId: string | null;

  @Column({ name: 'admin_name', type: 'varchar', length: 255, nullable: true })
  adminName: string | null;

  @Column({ name: 'admin_email', type: 'varchar', length: 255, nullable: true })
  adminEmail: string | null;

  @Column({ type: 'enum', enum: AdminAuditAction })
  action: AdminAuditAction;

  @Column({ type: 'enum', enum: AuditStatus, default: AuditStatus.SUCCESS })
  status: AuditStatus;

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
        type: 'ADMIN',
        id: this.adminId,
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
