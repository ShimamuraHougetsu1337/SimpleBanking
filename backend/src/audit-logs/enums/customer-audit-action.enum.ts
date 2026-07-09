export enum CustomerAuditAction {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGIN_RATE_LIMITED = 'login_rate_limited',
  LOGOUT = 'logout',
  UPDATE_PROFILE = 'update_profile',
  CHANGE_PASSWORD = 'change_password',
  TRANSFER = 'transfer',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  TRANSACTION_RATE_LIMITED = 'transaction_rate_limited',
}
