import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from '@/users/entities/user.entity';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';

import { SystemSetting } from '@/system-settings/entities/system-setting.entity';
import * as bcrypt from 'bcrypt';

const BCRYPT_SALT_ROUNDS = 10;

async function run() {
  console.log(
    'Bootstrapping NestJS application context for database seeding...',
  );
  const app = await NestFactory.createApplicationContext(AppModule);

  const dataSource = app.get(DataSource);
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    console.log('Truncating existing database tables (cascade)...');
    // Truncate tables in order to avoid foreign key constraint violations
    await queryRunner.query('TRUNCATE TABLE system_settings CASCADE;');
    await queryRunner.query('TRUNCATE TABLE transactions CASCADE;');
    await queryRunner.query('TRUNCATE TABLE ledger_entries CASCADE;');
    await queryRunner.query('TRUNCATE TABLE fee_settlement_logs CASCADE;');
    await queryRunner.query('TRUNCATE TABLE refresh_tokens CASCADE;');
    await queryRunner.query('TRUNCATE TABLE accounts CASCADE;');
    await queryRunner.query('TRUNCATE TABLE users CASCADE;');

    console.log('Hashing passwords...');
    const commonPasswordHash = await bcrypt.hash('123456', BCRYPT_SALT_ROUNDS);

    console.log('Creating users...');

    // Create SuperAdmin User
    const superAdminUser = new User();
    superAdminUser.fullName = 'System Administrator';
    superAdminUser.email = 'admin@gmail.com';
    superAdminUser.passwordHash = commonPasswordHash;
    superAdminUser.role = UserRole.SUPERADMIN;
    superAdminUser.status = UserStatus.ACTIVE;
    const savedAdmin = await queryRunner.manager.save(User, superAdminUser);
    console.log(`SuperAdmin user created with ID: ${savedAdmin.id}`);

    // Create Teller 1 User
    const teller1User = new User();
    teller1User.fullName = 'Teller 01';
    teller1User.email = 'teller1@gmail.com';
    teller1User.passwordHash = commonPasswordHash;
    teller1User.role = UserRole.TELLER;
    teller1User.status = UserStatus.ACTIVE;
    const savedTeller1 = await queryRunner.manager.save(User, teller1User);
    console.log(`Teller 1 user created with ID: ${savedTeller1.id}`);

    // Create Teller 2 User
    const teller2User = new User();
    teller2User.fullName = 'Teller 02';
    teller2User.email = 'teller2@gmail.com';
    teller2User.passwordHash = commonPasswordHash;
    teller2User.role = UserRole.TELLER;
    teller2User.status = UserStatus.ACTIVE;
    const savedTeller2 = await queryRunner.manager.save(User, teller2User);
    console.log(`Teller 2 user created with ID: ${savedTeller2.id}`);

    // Create Manager 1 User
    const manager1User = new User();
    manager1User.fullName = 'Manager 01';
    manager1User.email = 'manager1@gmail.com';
    manager1User.passwordHash = commonPasswordHash;
    manager1User.role = UserRole.MANAGER;
    manager1User.status = UserStatus.ACTIVE;
    const savedManager1 = await queryRunner.manager.save(User, manager1User);
    console.log(`Manager 1 user created with ID: ${savedManager1.id}`);

    // Create Manager 2 User
    const manager2User = new User();
    manager2User.fullName = 'Manager 02';
    manager2User.email = 'manager2@gmail.com';
    manager2User.passwordHash = commonPasswordHash;
    manager2User.role = UserRole.MANAGER;
    manager2User.status = UserStatus.ACTIVE;
    const savedManager2 = await queryRunner.manager.save(User, manager2User);
    console.log(`Manager 2 user created with ID: ${savedManager2.id}`);

    // Create Customer User
    const customerUser = new User();
    customerUser.fullName = 'Nguyen Van A';
    customerUser.email = 'customer@gmail.com';
    customerUser.passwordHash = commonPasswordHash;
    customerUser.role = UserRole.CUSTOMER;
    customerUser.status = UserStatus.ACTIVE;
    const savedCustomer = await queryRunner.manager.save(User, customerUser);
    console.log(`Customer user created with ID: ${savedCustomer.id}`);

    // =========================================================================
    // Create SYSTEM_CORE internal user + SYS_FEE_SUSPENSE account
    // This account is used by the double-entry ledger to accumulate transaction
    // fees without creating DB lock contention. It must ALWAYS exist.
    // =========================================================================
    const systemUser = new User();
    systemUser.fullName = 'SYSTEM_CORE';
    systemUser.email = 'system@banking.local';
    systemUser.passwordHash = await bcrypt.hash(`system_internal_${Date.now()}`, BCRYPT_SALT_ROUNDS);
    systemUser.role = UserRole.SUPERADMIN;
    systemUser.status = UserStatus.ACTIVE;
    const savedSystemUser = await queryRunner.manager.save(User, systemUser);
    console.log(`SYSTEM_CORE user created with ID: ${savedSystemUser.id}`);

    const suspenseAccount = new Account();
    suspenseAccount.user = savedSystemUser;
    suspenseAccount.accountNumber = 'SYS_FEE_SUSPENSE';
    suspenseAccount.name = 'Tài khoản Treo Phí Hệ Thống';
    suspenseAccount.balance = '0.00';
    suspenseAccount.currency = 'VND';
    suspenseAccount.status = AccountStatus.ACTIVE;
    await queryRunner.manager.save(Account, suspenseAccount);
    console.log('SYS_FEE_SUSPENSE account created.');

    const revenueAccount = new Account();
    revenueAccount.user = savedSystemUser;
    revenueAccount.accountNumber = 'SYS_REVENUE';
    revenueAccount.name = 'Tài khoản Doanh thu Hệ thống';
    revenueAccount.balance = '0.00';
    revenueAccount.currency = 'VND';
    revenueAccount.status = AccountStatus.ACTIVE;
    await queryRunner.manager.save(Account, revenueAccount);
    console.log('SYS_REVENUE account created.');

    const cashVaultAccount = new Account();
    cashVaultAccount.user = savedSystemUser;
    cashVaultAccount.accountNumber = 'SYS_CASH_VAULT';
    cashVaultAccount.name = 'Két Quỹ Tiền Mặt Hệ Thống';
    cashVaultAccount.balance = '0.00';
    cashVaultAccount.currency = 'VND';
    cashVaultAccount.status = AccountStatus.ACTIVE;
    await queryRunner.manager.save(Account, cashVaultAccount);
    console.log('SYS_CASH_VAULT account created.');

    console.log('Creating accounts...');

    // Create Admin Account
    const adminAccount = new Account();
    adminAccount.user = savedAdmin;
    adminAccount.accountNumber = 'VN10001000000001';
    adminAccount.name = 'VN10001000000001';
    adminAccount.balance = '0.00';
    adminAccount.currency = 'VND';
    adminAccount.status = AccountStatus.ACTIVE;
    const savedAdminAccount = await queryRunner.manager.save(
      Account,
      adminAccount,
    );
    console.log(`Admin account created with ID: ${savedAdminAccount.id}`);

    // Create Customer Account 1
    const customerAccount1 = new Account();
    customerAccount1.user = savedCustomer;
    customerAccount1.accountNumber = 'VN10001000001001';
    customerAccount1.name = 'Main Checking Account';
    customerAccount1.theme = 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)'; // Ocean Blue
    customerAccount1.balance = '0.00'; // 10,000,000.00 VND
    customerAccount1.currency = 'VND';
    customerAccount1.status = AccountStatus.ACTIVE;
    const savedCustomerAccount1 = await queryRunner.manager.save(
      Account,
      customerAccount1,
    );
    console.log(
      `Customer Account 1 created with ID: ${savedCustomerAccount1.id}`,
    );

    // Create Customer Account 2
    const customerAccount2 = new Account();
    customerAccount2.user = savedCustomer;
    customerAccount2.accountNumber = 'VN10001000001002';
    customerAccount2.name = 'Savings Account';
    customerAccount2.theme = 'linear-gradient(135deg, #064e3b 0%, #047857 100%)'; // Emerald Green
    customerAccount2.balance = '0.00'; // 5,000,000.00 VND
    customerAccount2.currency = 'VND';
    customerAccount2.status = AccountStatus.ACTIVE;
    const savedCustomerAccount2 = await queryRunner.manager.save(
      Account,
      customerAccount2,
    );
    console.log(
      `Customer Account 2 created with ID: ${savedCustomerAccount2.id}`,
    );

    console.log('Creating system settings...');
    const settings = [
      {
        settingKey: 'transfer_fee',
        settingValue: '5000.00',
        dataType: 'decimal',
        displayName: 'Phí chuyển khoản (VND)',
        description: 'Phí cố định áp dụng cho mỗi lần chuyển khoản.',
        groupName: 'transaction'
      },
      {
        settingKey: 'daily_limit',
        settingValue: '50000000.00',
        dataType: 'decimal',
        displayName: 'Hạn mức hàng ngày (VND)',
        description: 'Hạn mức chuyển tiền tối đa cho phép của mỗi người dùng trong một ngày.',
        groupName: 'transaction'
      },
      {
        settingKey: 'maintenance_mode',
        settingValue: 'false',
        dataType: 'boolean',
        displayName: 'Chế độ bảo trì hệ thống',
        description: 'Đặt toàn bộ ứng dụng vào trạng thái bảo trì. Khách hàng sẽ không thể đăng nhập hoặc thực hiện giao dịch.',
        groupName: 'system'
      },
      {
        settingKey: 'admin_audit_retention_days',
        settingValue: '365',
        dataType: 'int',
        displayName: 'Thời gian lưu Admin Audit Log (ngày)',
        description: 'Số ngày lưu trữ nhật ký hoạt động của quản trị viên.',
        groupName: 'audit'
      },
      {
        settingKey: 'customer_audit_retention_days',
        settingValue: '180',
        dataType: 'int',
        displayName: 'Thời gian lưu Customer Audit Log (ngày)',
        description: 'Số ngày lưu trữ nhật ký hoạt động của khách hàng.',
        groupName: 'audit'
      },
      {
        settingKey: 'high_value_transaction_threshold',
        settingValue: '500000000',
        dataType: 'decimal',
        displayName: 'Hạn mức phê duyệt (Nạp/Rút nội bộ)',
        description: 'Các giao dịch Nạp/Rút nội bộ vượt hạn mức này sẽ yêu cầu Quản lý phê duyệt (Nguyên tắc 4 mắt).',
        groupName: 'transaction'
      },
      {
        settingKey: 'max_login_failed_attempts',
        settingValue: '5',
        dataType: 'int',
        displayName: 'Số lần đăng nhập sai tối đa',
        description: 'Số lần nhập sai mật khẩu tối đa trước khi tài khoản bị khóa tạm thời.',
        groupName: 'security'
      },
      {
        settingKey: 'login_lockout_duration_minutes',
        settingValue: '15',
        dataType: 'int',
        displayName: 'Thời gian khóa đăng nhập (phút)',
        description: 'Thời gian khóa tài khoản tạm thời khi nhập sai mật khẩu quá số lần quy định.',
        groupName: 'security'
      },
      {
        settingKey: 'otp_transaction_threshold',
        settingValue: '10000000',
        dataType: 'decimal',
        displayName: 'Ngưỡng yêu cầu OTP giao dịch',
        description: 'Các giao dịch có giá trị lớn hơn hoặc bằng ngưỡng này sẽ yêu cầu xác thực OTP từ phía khách hàng.',
        groupName: 'transaction'
      }
    ];

    for (const settingData of settings) {
      const setting = queryRunner.manager.create(SystemSetting, settingData);
      await queryRunner.manager.save(SystemSetting, setting);
    }

    console.log('Committing transaction...');
    await queryRunner.commitTransaction();
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error occurred during seeding. Rolling back...', error);
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await app.close();
  }
}

run().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
