import { Injectable, ConflictException, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, OptimisticLockVersionMismatchError } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

export interface ParsedSystemSetting extends Omit<SystemSetting, 'settingValue'> {
  value: unknown;
}

export interface UpdateSettingsResult {
  settings: ParsedSystemSetting[];
  /** Giá trị cũ của các key vừa được cập nhật, dùng cho audit log */
  oldValues: Record<string, unknown>;
  /** Giá trị mới của các key vừa được cập nhật, dùng cho audit log */
  newValues: Record<string, unknown>;
}

@Injectable()
export class SystemSettingsService implements OnApplicationBootstrap {
  private readonly cache = new Map<string, any>();

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
  ) {}

  async onApplicationBootstrap() {
    await this.reloadCache();
  }

  private async reloadCache(): Promise<void> {
    const settings = await this.settingsRepo.find();
    const newCache = new Map<string, any>();
    for (const setting of settings) {
      newCache.set(setting.settingKey, this.parseValue(setting.settingValue, setting.dataType));
    }
    this.cache.clear();
    for (const [k, v] of newCache.entries()) {
      this.cache.set(k, v);
    }
  }

  private parseValue(value: string, type: string): unknown {
    switch (type) {
      case 'int':
        return parseInt(value, 10);
      case 'float':
      case 'decimal':
        return parseFloat(value);
      case 'string':
        return value;
      case 'boolean':
        return value === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      default:
        return value;
    }
  }

  private serializeValue(value: unknown, type: string): string {
    if (type === 'json') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  async getAllSettings(): Promise<ParsedSystemSetting[]> {
    const settings = await this.settingsRepo.find();
    return settings.map((s) => ({
      settingKey: s.settingKey,
      displayName: s.displayName,
      description: s.description,
      dataType: s.dataType,
      groupName: s.groupName,
      value: this.parseValue(s.settingValue, s.dataType),
      updatedBy: s.updatedBy,
      updatedAt: s.updatedAt,
      version: s.version,
    }));
  }

  getSetting<T>(key: string): T | null {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    return null;
  }

  private validateSettingValue(setting: SystemSetting, val: unknown): void {
    if (
      setting.groupName === 'transaction' ||
      ['int', 'decimal', 'float'].includes(setting.dataType)
    ) {
      const numVal = Number(val);
      if (
        val === null ||
        val === undefined ||
        val === '' ||
        isNaN(numVal) ||
        numVal < 0
      ) {
        throw new BadRequestException(
          `Giá trị cho "${setting.displayName || setting.settingKey}" phải là số hợp lệ lớn hơn hoặc bằng 0.`,
        );
      }
    }
  }

  async updateSettings(updates: Record<string, any>, updatedBy?: string): Promise<UpdateSettingsResult> {
    const settings = await this.settingsRepo.find();

    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    for (const setting of settings) {
      if (updates[setting.settingKey] !== undefined) {
        const val = updates[setting.settingKey] as unknown;
        this.validateSettingValue(setting, val);

        // Snapshot giá trị cũ trước khi ghi đè
        oldValues[setting.settingKey] = this.parseValue(setting.settingValue, setting.dataType);
        const newValue = this.serializeValue(updates[setting.settingKey], setting.dataType);
        setting.settingValue = newValue;
        newValues[setting.settingKey] = this.parseValue(newValue, setting.dataType);
        if (updatedBy) {
          setting.updatedBy = updatedBy;
        }
      }
    }

    try {
      await this.settingsRepo.save(settings);
      // Invalidate cache upon successful database save
      await this.reloadCache();
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException(
          'Cấu hình cài đặt đã bị thay đổi bởi một phiên làm việc khác. Vui lòng tải lại trang.',
        );
      }
      throw error;
    }
    return { settings: await this.getAllSettings(), oldValues, newValues };
  }
}
