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
    await queryRunner.query('TRUNCATE TABLE transactions CASCADE;');
    await queryRunner.query('TRUNCATE TABLE refresh_tokens CASCADE;');
    await queryRunner.query('TRUNCATE TABLE accounts CASCADE;');
    await queryRunner.query('TRUNCATE TABLE users CASCADE;');

    console.log('Hashing passwords...');
    const commonPasswordHash = await bcrypt.hash('123456', BCRYPT_SALT_ROUNDS);

    console.log('Creating users...');

    // Create Admin User
    const adminUser = new User();
    adminUser.full_name = 'System Administrator';
    adminUser.email = 'admin@gmail.com';
    adminUser.password_hash = commonPasswordHash;
    adminUser.role = UserRole.ADMIN;
    adminUser.status = UserStatus.ACTIVE;
    const savedAdmin = await queryRunner.manager.save(User, adminUser);
    console.log(`Admin user created with ID: ${savedAdmin.id}`);

    // Create Customer User
    const customerUser = new User();
    customerUser.full_name = 'Nguyen Van A';
    customerUser.email = 'customer@gmail.com';
    customerUser.password_hash = commonPasswordHash;
    customerUser.role = UserRole.CUSTOMER;
    customerUser.status = UserStatus.ACTIVE;
    const savedCustomer = await queryRunner.manager.save(User, customerUser);
    console.log(`Customer user created with ID: ${savedCustomer.id}`);

    console.log('Creating accounts...');

    // Create Admin Account
    const adminAccount = new Account();
    adminAccount.user = savedAdmin;
    adminAccount.account_number = 'VN10001000000001';
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
    customerAccount1.account_number = 'VN10001000001001';
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
    customerAccount2.account_number = 'VN10001000001002';
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
    tx1.from_account_id = null;
    tx1.fromAccount = null;
    tx1.to_account_id = savedCustomerAccount1.id;
    tx1.toAccount = savedCustomerAccount1;
    tx1.amount = '12000000.00';
    tx1.type = TransactionType.DEPOSIT;
    tx1.status = TransactionStatus.SUCCESS;
    tx1.description = 'Initial cash deposit';
    tx1.created_at = threeDaysAgo;
    await queryRunner.manager.save(Transaction, tx1);

    // 2. Transfer from Account 1 to Account 2: 2,000,000.00 VND
    const tx2 = new Transaction();
    tx2.from_account_id = savedCustomerAccount1.id;
    tx2.fromAccount = savedCustomerAccount1;
    tx2.to_account_id = savedCustomerAccount2.id;
    tx2.toAccount = savedCustomerAccount2;
    tx2.amount = '2000000.00';
    tx2.type = TransactionType.TRANSFER;
    tx2.status = TransactionStatus.SUCCESS;
    tx2.description = 'Transfer to savings account';
    tx2.created_at = twoDaysAgo;
    await queryRunner.manager.save(Transaction, tx2);

    // 3. Deposit to Account 2: 3,500,000.00 VND
    const tx3 = new Transaction();
    tx3.from_account_id = null;
    tx3.fromAccount = null;
    tx3.to_account_id = savedCustomerAccount2.id;
    tx3.toAccount = savedCustomerAccount2;
    tx3.amount = '3500000.00';
    tx3.type = TransactionType.DEPOSIT;
    tx3.status = TransactionStatus.SUCCESS;
    tx3.description = 'Cash deposit via ATM';
    tx3.created_at = oneDayAgo;
    await queryRunner.manager.save(Transaction, tx3);

    // 4. Withdrawal from Account 2: 500,000.00 VND
    const tx4 = new Transaction();
    tx4.from_account_id = savedCustomerAccount2.id;
    tx4.fromAccount = savedCustomerAccount2;
    tx4.to_account_id = null;
    tx4.toAccount = null;
    tx4.amount = '500000.00';
    tx4.type = TransactionType.WITHDRAW;
    tx4.status = TransactionStatus.SUCCESS;
    tx4.description = 'ATM cash withdrawal';
    tx4.created_at = fewHoursAgo;
    await queryRunner.manager.save(Transaction, tx4);

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
