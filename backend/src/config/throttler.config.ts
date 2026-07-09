import { registerAs } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { LruCacheThrottlerStorage } from '@/auth/storage/lru-cache-throttler.storage';

/**
 * Throttler configuration factory registered under the 'throttler' namespace.
 * Sourced from environment variables with safe defaults.
 */
export default registerAs('throttler', (): ThrottlerModuleOptions => ({
  throttlers: [
    {
      name: 'login',
      ttl: parseInt(process.env.THROTTLER_LOGIN_TTL ?? '60000', 10),
      limit: parseInt(process.env.THROTTLER_LOGIN_LIMIT ?? '5', 10),
      blockDuration: parseInt(process.env.THROTTLER_LOGIN_BLOCK_DURATION ?? '60000', 10),
    },
    {
      name: 'transactions',
      ttl: parseInt(process.env.THROTTLER_TX_TTL ?? '60000', 10),
      limit: parseInt(process.env.THROTTLER_TX_LIMIT ?? '10', 10),
      blockDuration: parseInt(process.env.THROTTLER_TX_BLOCK_DURATION ?? '60000', 10),
    },
  ],
  storage: new LruCacheThrottlerStorage(),
}));
