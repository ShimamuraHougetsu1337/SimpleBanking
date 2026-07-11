export const queryKeys = {
  // Customer Query Keys
  accounts: {
    all: ['accounts'] as const,
    me: () => [...queryKeys.accounts.all, 'me'] as const,
    detail: (id: string) => [...queryKeys.accounts.all, id] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (params: unknown) => [...queryKeys.transactions.all, params] as const,
    byAccount: (accountId: string, params?: unknown) => [...queryKeys.transactions.all, accountId, params] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    transactions: (accountIds?: string[]) => [...queryKeys.dashboard.all, 'transactions', accountIds] as const,
  },
  settings: {
    profile: ['profile'] as const,
    transferFee: ['transferFee'] as const,
  },
  // Admin Query Keys
  admin: {
    users: {
      all: ['adminUsers'] as const,
      list: (params: unknown) => [...queryKeys.admin.users.all, params] as const,
    },
    accounts: {
      all: ['adminAccounts'] as const,
      list: (params: unknown) => [...queryKeys.admin.accounts.all, params] as const,
    },
    transactions: {
      all: ['adminTransactions'] as const,
      list: (params: unknown) => [...queryKeys.admin.transactions.all, params] as const,
    },
    transactionRequests: {
      all: ['adminTransactionRequests'] as const,
      list: (page: number, pageSize: number, statusFilter: string | undefined) => [...queryKeys.admin.transactionRequests.all, page, pageSize, statusFilter] as const,
    },
    stats: {
      dashboard: ['adminDashboardStats'] as const,
    },
    settings: {
      all: ['adminSettings'] as const,
    },
    auditLogs: {
      all: ['adminAuditLogs'] as const,
      list: (activeTab: string, params: unknown) => [...queryKeys.admin.auditLogs.all, activeTab, params] as const,
    }
  }
};
