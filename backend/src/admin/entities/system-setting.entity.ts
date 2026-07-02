import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ name: 'setting_key', length: 100 })
  settingKey: string;

  @Column({ name: 'setting_value', type: 'text' })
  settingValue: string;

  @Column({ name: 'data_type', length: 20 })
  dataType: string; // 'int', 'float', 'string', 'boolean', 'json'

  @Column({ name: 'display_name', length: 150 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'group_name', length: 50 })
  groupName: string;

  @Column({ name: 'updated_by', length: 100, nullable: true })
  updatedBy: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
