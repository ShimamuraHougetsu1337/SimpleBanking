import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SystemSetting } from '@/admin/entities/system-setting.entity';

@Injectable()
export class FeesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) { }

  async getTransferFee(): Promise<{ fee: string }> {
    const feeSetting = await this.dataSource.getRepository(SystemSetting).findOne({ where: { settingKey: 'transfer_fee' } });
    return { fee: feeSetting?.settingValue || '0.00' };
  }
}
