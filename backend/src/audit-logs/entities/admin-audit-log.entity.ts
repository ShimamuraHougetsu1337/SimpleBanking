import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
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

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
