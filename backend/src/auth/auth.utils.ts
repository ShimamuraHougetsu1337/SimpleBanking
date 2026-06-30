import * as crypto from 'crypto';
import ms, { StringValue } from 'ms';

const HASH_ALGORITHM = 'sha256';
const HASH_DIGEST_ENCODING: crypto.BinaryToTextEncoding = 'hex';

/**
 * Hashes a raw refresh token using SHA-256 before storing or querying it.
 */
export function hashToken(token: string): string {
  return crypto.createHash(HASH_ALGORITHM).update(token).digest(HASH_DIGEST_ENCODING);
}

/**
 * Calculates the refresh token expiration date from a time duration string (e.g., '7d').
 * Throws an error if the format is invalid.
 */
export function calculateRefreshTokenExpiresAt(expiresInStr: string): Date {
  const refreshExpiresInMs = ms(expiresInStr as StringValue);
  if (refreshExpiresInMs === undefined || isNaN(refreshExpiresInMs)) {
    throw new Error(`Invalid REFRESH_TOKEN_EXPIRES_IN format: ${expiresInStr}`);
  }
  return new Date(Date.now() + refreshExpiresInMs);
}
