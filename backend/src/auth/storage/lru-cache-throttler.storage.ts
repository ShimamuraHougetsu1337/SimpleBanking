import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { LRUCache } from 'lru-cache';

interface HitRecord {
  /** Timestamps (ms) of each hit within the current window */
  hits: number[];
  /** Epoch ms until which this key is blocked (0 = not blocked) */
  blockedUntil: number;
}

/**
 * Custom ThrottlerStorage backed by an LRU Cache.
 *
 * Benefits over the default in-memory Map:
 *  - Bounded memory: evicts least-recently-used entries when `max` is reached.
 *  - Automatic TTL eviction: entries are purged after their window expires,
 *    eliminating the need for a manual cleanup interval.
 */
export class LruCacheThrottlerStorage implements ThrottlerStorage {
  private readonly cache = new LRUCache<string, HitRecord>({
    /** Hard cap: drop oldest entries when exceeded */
    max: 10_000,
    /** Allow per-entry TTL so cache auto-evicts stale windows */
    ttl: 0, // per-entry TTL is set dynamically in increment()
    allowStale: false,
  });

  increment(
    key: string,
    ttl: number,           // window size in milliseconds
    limit: number,
    blockDuration: number, // block time in milliseconds (0 = no block)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const now = Date.now();
    const windowStart = now - ttl;

    // Load or create record for this key
    const record: HitRecord = this.cache.get(key) ?? { hits: [], blockedUntil: 0 };

    // Prune hits that have fallen outside the current window
    record.hits = record.hits.filter((t) => t > windowStart);
    record.hits.push(now);

    const totalHits = record.hits.length;
    const isBlocked = totalHits > limit;

    // Set block expiry on first overflow, keep it while still in block window
    if (isBlocked && (record.blockedUntil === 0 || now > record.blockedUntil)) {
      record.blockedUntil = now + blockDuration;
    } else if (!isBlocked) {
      record.blockedUntil = 0;
    }

    // Time until the oldest hit in this window expires → when the window resets
    const oldestHit = record.hits[0] ?? now;
    const timeToExpire = Math.max(0, Math.ceil((oldestHit + ttl - now) / 1000));

    const timeToBlockExpire =
      record.blockedUntil > now
        ? Math.ceil((record.blockedUntil - now) / 1000)
        : 0;

    // Persist the updated record; use ttl so LRU evicts it when the window closes
    this.cache.set(key, record, { ttl });

    return Promise.resolve({ totalHits, timeToExpire, isBlocked, timeToBlockExpire });
  }
}
