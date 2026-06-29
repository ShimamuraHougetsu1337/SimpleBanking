import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Database configuration factory registered under the 'database' namespace.
 * All values are sourced from environment variables — never hard-coded.
 */
export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME ?? 'banking_db',
  username: process.env.DB_USERNAME ?? 'banking_user',
  password: process.env.DB_PASSWORD ?? '',
  // Auto-sync entity schema — enabled only in development, NEVER in production
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  // Load entities compiled to dist — avoids having to enumerate them manually
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  autoLoadEntities: true,
}));
