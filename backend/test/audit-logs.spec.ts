/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { User, UserRole, UserStatus } from '../src/users/entities/user.entity';
import { AdminAuditLog } from '../src/audit-logs/entities/admin-audit-log.entity';
import { CustomerAuditLog } from '../src/audit-logs/entities/customer-audit-log.entity';
import { AdminAuditAction } from '../src/audit-logs/enums/admin-audit-action.enum';
import { CustomerAuditAction } from '../src/audit-logs/enums/customer-audit-action.enum';
import { DataSource } from 'typeorm';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

describe('Audit Logs & Authorization Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Mock users
  let customerUser: User;
  let targetUser: User;

  // JWT Tokens
  let superAdminToken: string;
  let managerToken: string;
  let customerToken: string;

  beforeAll(async () => {
    // Override the DB URL for testing to avoid polluting development DB
    process.env.DB_NAME = 'banking_db_test'; // configuration factory reads this

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Clean tables before seeding using TRUNCATE CASCADE to bypass all FK constraints
    await dataSource.query('TRUNCATE TABLE "users", "accounts", "admin_audit_logs", "customer_audit_logs" CASCADE;');

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // Seed test users
    await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        fullName: 'Super Admin',
        email: 'superadmin@example.com',
        phoneNumber: '0999999999',
        role: UserRole.SUPERADMIN,
        status: UserStatus.ACTIVE,
        passwordHash,
      }),
    );

    await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        fullName: 'Manager User',
        email: 'manager@example.com',
        phoneNumber: '0988888888',
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
        passwordHash,
      }),
    );

    customerUser = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        fullName: 'Customer User',
        email: 'customer@example.com',
        phoneNumber: '0977777777',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        passwordHash,
      }),
    );

    targetUser = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        fullName: 'Target User',
        email: 'target@example.com',
        phoneNumber: '0966666666',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        passwordHash,
      }),
    );

    // Login to get tokens
    const login = async (email: string): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'Password123!' });
      return (res.body as { accessToken: string }).accessToken;
    };

    superAdminToken = await login('superadmin@example.com');
    managerToken = await login('manager@example.com');
    customerToken = await login('customer@example.com');
  }, 40000);

  afterAll(async () => {
    if (dataSource) {
      await dataSource.destroy();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Authorization on Audit Logs endpoints', () => {
    it('should deny access to unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/audit-logs/admin').expect(401);
      await request(app.getHttpServer()).get('/audit-logs/customer').expect(401);
    });

    it('should allow SuperAdmin to view both admin and customer logs', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs/admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/audit-logs/customer')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });

    it('should allow Manager to view customer logs and admin logs (filtered)', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs/admin')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/audit-logs/customer')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });

    it('should reject Customer from viewing either log endpoint', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs/admin')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/audit-logs/customer')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe('Audit Log Functionality and Schema Validation', () => {
    it('should log LOCK_USER with before_data and after_data matching target old and new status', async () => {
      // Clear logs first
      await dataSource.getRepository(AdminAuditLog).createQueryBuilder().delete().execute();

      // Lock the targetUser using SuperAdmin
      await request(app.getHttpServer())
        .patch(`/admin/users/${targetUser.id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'locked' })
        .expect(200);

      // Verify log entry in admin_audit_logs
      // Wait for async interceptor to save the log
      await new Promise((resolve) => setTimeout(resolve, 100));
      const logs = await dataSource.getRepository(AdminAuditLog).find();
      expect(logs.length).toBeGreaterThanOrEqual(1);

      const lockLog = logs.find((l) => l.action === AdminAuditAction.LOCK_USER);
      expect(lockLog).toBeDefined();
      expect(lockLog?.entity).toBe('user');
      expect(lockLog?.entityId).toBe(targetUser.id);
      expect(lockLog?.beforeData).toEqual({ status: 'active' });
      expect(lockLog?.afterData).toEqual({ status: 'locked' });
      expect(lockLog?.metadata).toBeDefined();
      expect((lockLog?.metadata as Record<string, any> | undefined)?.['data_changes']).toEqual({
        old_data: { status: 'active' },
        new_data: { status: 'locked' },
      });
    });

    it('should log UNLOCK_USER with before_data and after_data matching target old and new status', async () => {
      // Clear logs first
      await dataSource.getRepository(AdminAuditLog).createQueryBuilder().delete().execute();

      // Unlock the targetUser using SuperAdmin
      await request(app.getHttpServer())
        .patch(`/admin/users/${targetUser.id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'active' })
        .expect(200);

      // Verify log entry in admin_audit_logs
      await new Promise((resolve) => setTimeout(resolve, 100));
      const logs = await dataSource.getRepository(AdminAuditLog).find();
      expect(logs.length).toBeGreaterThanOrEqual(1);

      const unlockLog = logs.find((l) => l.action === AdminAuditAction.UNLOCK_USER);
      expect(unlockLog).toBeDefined();
      expect(unlockLog?.entity).toBe('user');
      expect(unlockLog?.entityId).toBe(targetUser.id);
      expect(unlockLog?.beforeData).toEqual({ status: 'locked' });
      expect(unlockLog?.afterData).toEqual({ status: 'active' });
    });

    it('should log CHANGE_PASSWORD for customer with before_data and after_data', async () => {
      // Clear logs first
      await dataSource.getRepository(CustomerAuditLog).createQueryBuilder().delete().execute();

      // Change password of customerUser
      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ oldPassword: 'Password123!', newPassword: 'NewPassword123!' })
        .expect(200);

      // Verify log entry in customer_audit_logs
      await new Promise((resolve) => setTimeout(resolve, 100));
      const logs = await dataSource.getRepository(CustomerAuditLog).find();
      expect(logs.length).toBeGreaterThanOrEqual(1);

      const pwLog = logs.find((l) => l.action === CustomerAuditAction.CHANGE_PASSWORD);
      expect(pwLog).toBeDefined();
      expect(pwLog?.entity).toBe('user');
      expect(pwLog?.entityId).toBe(customerUser.id);
      expect(pwLog?.beforeData).toEqual({});
      expect(pwLog?.afterData?.['passwordChanged']).toBe(true);
      expect(pwLog?.afterData?.['changedAt']).toBeDefined();
    });
  });
});
