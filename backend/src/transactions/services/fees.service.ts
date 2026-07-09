import { Injectable } from '@nestjs/common';
import { SystemSettingsService } from '@/system-settings/system-settings.service';

@Injectable()
export class FeesService {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
  ) { }

  getTransferFee(): { fee: string } {
    const feeVal = this.systemSettingsService.getSetting<number>('transfer_fee');
    return { fee: feeVal !== null ? feeVal.toFixed(2) : '0.00' };
  }
}
