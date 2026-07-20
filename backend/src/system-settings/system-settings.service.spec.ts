/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { SystemSetting } from './entities/system-setting.entity';

describe('SystemSettingsService', () => {
  let service: SystemSettingsService;
  let repo: jest.Mocked<Repository<SystemSetting>>;

  const mockSettings: SystemSetting[] = [
    {
      settingKey: 'transfer_fee',
      settingValue: '5000.00',
      dataType: 'decimal',
      displayName: 'Phí chuyển khoản (VND)',
      description: 'Phí cố định áp dụng cho mỗi lần chuyển khoản.',
      groupName: 'transaction',
      updatedBy: 'system',
      updatedAt: new Date(),
      version: 1,
    },
    {
      settingKey: 'daily_limit',
      settingValue: '50000000.00',
      dataType: 'decimal',
      displayName: 'Hạn mức hàng ngày (VND)',
      description: 'Hạn mức chuyển tiền tối đa cho phép.',
      groupName: 'transaction',
      updatedBy: 'system',
      updatedAt: new Date(),
      version: 1,
    },
    {
      settingKey: 'max_login_failed_attempts',
      settingValue: '5',
      dataType: 'int',
      displayName: 'Số lần đăng nhập sai tối đa',
      description: 'Số lần nhập sai mật khẩu tối đa.',
      groupName: 'security',
      updatedBy: 'system',
      updatedAt: new Date(),
      version: 1,
    },
    {
      settingKey: 'maintenance_mode',
      settingValue: 'false',
      dataType: 'boolean',
      displayName: 'Chế độ bảo trì hệ thống',
      description: 'Đặt toàn bộ ứng dụng vào trạng thái bảo trì.',
      groupName: 'system',
      updatedBy: 'system',
      updatedAt: new Date(),
      version: 1,
    },
  ];

  beforeEach(async () => {
    const mockRepo = {
      find: jest.fn().mockResolvedValue(mockSettings),
      save: jest.fn().mockImplementation((settings) => Promise.resolve(settings)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemSettingsService,
        {
          provide: getRepositoryToken(SystemSetting),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<SystemSettingsService>(SystemSettingsService);
    repo = module.get(getRepositoryToken(SystemSetting));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should allow valid updates with non-negative numeric values', async () => {
    const result = await service.updateSettings(
      { transfer_fee: 10000, daily_limit: '100000000.00' },
      'admin_test',
    );

    expect(repo.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should throw BadRequestException if transaction rule is updated with negative number', async () => {
    await expect(
      service.updateSettings({ transfer_fee: -5000 }, 'admin_test'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if numeric setting is updated with negative number', async () => {
    await expect(
      service.updateSettings({ max_login_failed_attempts: -1 }, 'admin_test'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if numeric setting is updated with empty or NaN string', async () => {
    await expect(
      service.updateSettings({ daily_limit: 'abc' }, 'admin_test'),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.updateSettings({ transfer_fee: '' }, 'admin_test'),
    ).rejects.toThrow(BadRequestException);
  });
});
