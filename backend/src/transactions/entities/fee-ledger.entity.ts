import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum FeeLedgerType {
  CREDIT = 'credit', // Nhận phí từ giao dịch
  DEBIT = 'debit',   // Quyết toán phí cho admin hoặc hoàn phí
}

@Entity('fee_ledger')
export class FeeLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({
    type: 'enum',
    enum: FeeLedgerType,
    default: FeeLedgerType.CREDIT,
  })
  type: FeeLedgerType;

  @Column({ length: 255, nullable: true })
  description: string;

  @Index()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
