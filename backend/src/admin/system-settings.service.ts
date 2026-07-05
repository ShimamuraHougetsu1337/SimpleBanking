import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
  ) {}

  private parseValue(value: string, type: string): unknown {
    switch (type) {
      case 'int':
        return parseInt(value, 10);
      case 'float':
        return parseFloat(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      case 'decimal':
      case 'string':
      default:
        return value;
    }
  }

  private serializeValue(value: any, type: string): string {
    switch (type) {
      case 'boolean':
        return value ? 'true' : 'false';
      case 'json':
        return JSON.stringify(value);
      case 'int':
      case 'float':
      case 'decimal':
      case 'string':
      default:
        return String(value);
    }
  }

  async getAllSettings(): Promise<ParsedSystemSetting[]> {
    const settings = await this.settingsRepo.find();
    return settings.map((s) => ({
      settingKey: s.settingKey,
      value: this.parseValue(s.settingValue, s.dataType),
      dataType: s.dataType,
      displayName: s.displayName,
      description: s.description,
      groupName: s.groupName,
      updatedBy: s.updatedBy,
      updatedAt: s.updatedAt,
    }));
  }

  async getSetting<T>(key: string): Promise<T | null> {
    const setting = await this.settingsRepo.findOne({ where: { settingKey: key } });
    if (!setting) return null;
    return this.parseValue(setting.settingValue, setting.dataType) as T;
  }

  async updateSettings(updates: Record<string, any>, updatedBy?: string): Promise<UpdateSettingsResult> {
    const settings = await this.settingsRepo.find();

    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    for (const setting of settings) {
      if (updates[setting.settingKey] !== undefined) {
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

    await this.settingsRepo.save(settings);
    return { settings: await this.getAllSettings(), oldValues, newValues };
  }
}
