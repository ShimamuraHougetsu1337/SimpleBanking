export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  accountNumber: string | null;
  balance: string;
  isOtpBlocked?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  includeDeleted?: boolean;
  roleGroup?: 'customer' | 'staff';
}

export interface GetUsersResponse {
  data: AdminUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminAccount {
  id: string;
  accountNumber: string;
  balance: string;
  holdBalance: string;
  dailyLimit?: string | null;
  currency: string;
  status: string;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
}

export interface GetAccountsResponse {
  data: AdminAccount[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminTransaction {
  id: string;
  type: string;
  amount: string;
  fee?: string;
  totalAmount?: string;
  status: string;
  description: string;
  fromAccount: string | null;
  fromUserName: string | null;
  toAccount: string | null;
  toUserName: string | null;
  createdAt: string;
  originalTransactionId: string | null;
}

export interface GetTransactionsResponse {
  data: AdminTransaction[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    totalVolume: string;
    successfulCount: number;
    failedCount: number;
  };
}

export interface DashboardStats {
  totalUsers: number;
  totalAccounts: number;
  totalBalance: string;
  cashVaultBalance?: string;
  totalCustomerDeposits?: string;
  bankRevenue?: string;
  weeklyVolume: { date: string; volume: string }[];
  pendingCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  todayDepositsVolume?: string;
  todayWithdrawalsVolume?: string;
  todayCompletedCount?: number;
  pendingRequestsCount?: number;
  totalDepositsToday?: string;
  totalWithdrawalsToday?: string;
  netCashFlowToday?: string;
  tellerPerformance?: {
    tellerId: string;
    tellerName: string;
    tellerEmail: string;
    pendingCount: number;
    completedCount: number;
    rejectedCount: number;
    totalVolume: string;
  }[];
}

export interface SystemSetting {
  settingKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  dataType: string;
  displayName: string;
  description: string;
  groupName: string;
}

export interface UserHistoryRecord {
  id: string;
  userId: string;
  changedById: string | null;
  changedField: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface LedgerEntryRecord {
  id: string;
  accountId: string;
  transactionId: string;
  type: string;
  amount: string;
  balanceAfter: string;
  createdAt: string;
  transaction?: AdminTransaction;
}

export interface GetLedgerResponse {
  data: LedgerEntryRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminAuditLog {
  id: string;
  adminId: string | null;
  adminName: string | null;
  adminEmail: string | null;
  action: string;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
}

export interface CustomerAuditLog {
  id: string;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  action: string;
  status: string;
  transactionId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
}

export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetAdminAuditLogsResponse {
  data: AdminAuditLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetCustomerAuditLogsResponse {
  data: CustomerAuditLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminTransactionRequest {
  id: string;
  type: string;
  amount: string;
  status: string;
  description: string;
  accountNumber: string;
  userName: string;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectionReason?: string | null;
  originalTransactionId?: string | null;
}

export interface MismatchDetail {
  accountId: string;
  accountNumber: string;
  cachedBalance: string;
  computedBalance: string;
  difference: string;
}

export interface ReconciliationReport {
  id: string;
  checkedAt: string;
  status: 'OK' | 'MISMATCH';
  totalAccounts: number;
  mismatchCount: number;
  details: MismatchDetail[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetReconciliationReportsResponse {
  data: ReconciliationReport[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

