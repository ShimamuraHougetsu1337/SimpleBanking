import { Injectable } from '@nestjs/common';
import { SystemSettingsService } from '@/system-settings/system-settings.service';

@Injectable()
export class FeesService {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
  ) { }

  getTransferFee(): { fee: string } {
    const feeVal = this.systemSettingsService.getSetting<number | string>('transfer_fee');
    if (feeVal === null || feeVal === undefined) {
      return { fee: '0.00' };
    }
    const numFee = typeof feeVal === 'string' ? parseFloat(feeVal) : feeVal;
    return { fee: isNaN(numFee) ? '0.00' : numFee.toFixed(2) };
  }
}
