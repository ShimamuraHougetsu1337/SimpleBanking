import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from '@/users/entities/user.entity';
import { Account, AccountStatus } from '@/accounts/entities/account.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '@/transactions/entities/transaction.entity';
import { SystemSetting } from '@/admin/entities/system-setting.entity';
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

    // Create Teller User
    const tellerUser = new User();
    tellerUser.fullName = 'Teller 01';
    tellerUser.email = 'teller@gmail.com';
    tellerUser.passwordHash = commonPasswordHash;
    tellerUser.role = UserRole.TELLER;
    tellerUser.status = UserStatus.ACTIVE;
    const savedTeller = await queryRunner.manager.save(User, tellerUser);
    console.log(`Teller user created with ID: ${savedTeller.id}`);

    // Create Manager User
    const managerUser = new User();
    managerUser.fullName = 'Manager 01';
    managerUser.email = 'manager@gmail.com';
    managerUser.passwordHash = commonPasswordHash;
    managerUser.role = UserRole.MANAGER;
    managerUser.status = UserStatus.ACTIVE;
    const savedManager = await queryRunner.manager.save(User, managerUser);
    console.log(`Manager user created with ID: ${savedManager.id}`);

    // Create Customer User
    const customerUser = new User();
    customerUser.fullName = 'Nguyen Van A';
    customerUser.email = 'customer@gmail.com';
    customerUser.passwordHash = commonPasswordHash;
    customerUser.role = UserRole.CUSTOMER;
    customerUser.status = UserStatus.ACTIVE;
    const savedCustomer = await queryRunner.manager.save(User, customerUser);
    console.log(`Customer user created with ID: ${savedCustomer.id}`);

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
    customerAccount1.balance = '10000000.00'; // 10,000,000.00 VND
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
    customerAccount2.balance = '5000000.00'; // 5,000,000.00 VND
    customerAccount2.currency = 'VND';
    customerAccount2.status = AccountStatus.ACTIVE;
    const savedCustomerAccount2 = await queryRunner.manager.save(
      Account,
      customerAccount2,
    );
    console.log(
      `Customer Account 2 created with ID: ${savedCustomerAccount2.id}`,
    );


    console.log('Creating transaction history...');



    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const fewHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    // 1. Initial Deposit to Account 1: 12,000,000.00 VND
    const tx1 = new Transaction();
    tx1.fromAccountId = null;
    tx1.fromAccount = null;
    tx1.toAccountId = savedCustomerAccount1.id;
    tx1.toAccount = savedCustomerAccount1;
    tx1.amount = '12000000.00';
    tx1.fee = '0.00';
    tx1.totalAmount = '12000000.00';
    tx1.type = TransactionType.DEPOSIT;
    tx1.status = TransactionStatus.COMPLETED;
    tx1.description = 'Initial cash deposit';
    tx1.createdAt = threeDaysAgo;
    await queryRunner.manager.save(Transaction, tx1);

    // 2. Transfer from Account 1 to Account 2: 2,000,000.00 VND
    const tx2 = new Transaction();
    tx2.fromAccountId = savedCustomerAccount1.id;
    tx2.fromAccount = savedCustomerAccount1;
    tx2.toAccountId = savedCustomerAccount2.id;
    tx2.toAccount = savedCustomerAccount2;
    tx2.amount = '2000000.00';
    tx2.fee = '0.00';
    tx2.totalAmount = '2000000.00';
    tx2.type = TransactionType.TRANSFER;
    tx2.status = TransactionStatus.COMPLETED;
    tx2.description = 'Transfer to savings account';
    tx2.createdAt = twoDaysAgo;
    await queryRunner.manager.save(Transaction, tx2);

    // 3. Deposit to Account 2: 3,500,000.00 VND
    const tx3 = new Transaction();
    tx3.fromAccountId = null;
    tx3.fromAccount = null;
    tx3.toAccountId = savedCustomerAccount2.id;
    tx3.toAccount = savedCustomerAccount2;
    tx3.amount = '3500000.00';
    tx3.fee = '0.00';
    tx3.totalAmount = '3500000.00';
    tx3.type = TransactionType.DEPOSIT;
    tx3.status = TransactionStatus.COMPLETED;
    tx3.description = 'Cash deposit via ATM';
    tx3.createdAt = oneDayAgo;
    await queryRunner.manager.save(Transaction, tx3);

    // 4. Withdrawal from Account 2: 500,000.00 VND
    const tx4 = new Transaction();
    tx4.fromAccountId = savedCustomerAccount2.id;
    tx4.fromAccount = savedCustomerAccount2;
    tx4.toAccountId = null;
    tx4.toAccount = null;
    tx4.amount = '500000.00';
    tx4.fee = '0.00';
    tx4.totalAmount = '500000.00';
    tx4.type = TransactionType.WITHDRAW;
    tx4.status = TransactionStatus.COMPLETED;
    tx4.description = 'ATM cash withdrawal';
    tx4.createdAt = fewHoursAgo;
    await queryRunner.manager.save(Transaction, tx4);

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
