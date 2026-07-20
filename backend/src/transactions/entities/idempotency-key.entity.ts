import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum IdempotencyStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('idempotency_keys')
export class IdempotencyKey {
  @PrimaryColumn({ length: 64 })
  key: string;

  @Column({ name: 'request_hash', length: 64 })
  requestHash: string;

  @Column({ type: 'jsonb', nullable: true })
  response: Record<string, unknown> | null;

  @Column({ name: 'status_code', type: 'integer', nullable: true })
  statusCode: number | null;

  @Column({
    type: 'enum',
    enum: IdempotencyStatus,
    default: IdempotencyStatus.PROCESSING,
  })
  status: IdempotencyStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Index()
  @Column({ type: 'timestamptz', name: 'expired_at', nullable: true })
  expiredAt: Date | null;
}
