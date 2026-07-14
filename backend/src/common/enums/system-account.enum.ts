/**
 * System-reserved account identifiers.
 *
 * These values correspond to accounts and users that are seeded automatically
 * during database initialisation and must never be locked, frozen, or deleted
 * through the normal admin UI.
 *
 * Usage:
 *   import { SystemAccount } from '@/common/enums/system-account.enum';
 *   if (account.accountNumber === SystemAccount.FEE_SUSPENSE) { ... }
 */
export enum SystemAccount {
  /**
   * Internal ledger sink for transaction fees.
   * Fees are credited here in real-time and swept to the admin account hourly.
   * This account must NEVER be locked, frozen, or soft-deleted.
   */
  FEE_SUSPENSE = 'SYS_FEE_SUSPENSE',
  REVENUE = 'SYS_REVENUE',
  CASH_VAULT = 'SYS_CASH_VAULT',
  EMAIL = 'system@banking.local'
}