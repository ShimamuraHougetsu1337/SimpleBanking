import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, Index } from 'typeorm';

@Entity('fee_settlement_logs')
export class FeeSettlementLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: '0.00' })
  amount: string;

  @Index()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
