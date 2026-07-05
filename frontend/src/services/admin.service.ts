import api from './api';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  accountNumber: string | null;
  balance: string;
  createdAt: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
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
  weeklyVolume: { date: string; volume: string }[];
}

export interface SystemSetting {
  settingKey: string;
  value: any;
  dataType: string;
  displayName: string;
  description: string;
  groupName: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string | null;
  adminName: string | null;
  adminEmail: string | null;
  action: string;
  status: string;
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

export const adminService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await api.get('/admin/dashboard-stats');
    return data;
  },

  async getUsers(params?: GetUsersParams): Promise<GetUsersResponse> {
    const { data } = await api.get('/admin/users', { params });
    return data;
  },

  async updateUserStatus(id: string, status: 'active' | 'locked'): Promise<AdminUser> {
    const { data } = await api.patch(`/admin/users/${id}/status`, { status });
    return data;
  },

  async getAccounts(params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<GetAccountsResponse> {
    const { data } = await api.get('/admin/accounts', { params });
    return data;
  },

  async updateAccountStatus(id: string, status: 'active' | 'locked'): Promise<AdminAccount> {
    const { data } = await api.patch(`/admin/accounts/${id}/status`, { status });
    return data;
  },

  async depositToAccount(id: string, amount: string, description?: string): Promise<any> {
    const { data } = await api.post(`/admin/accounts/${id}/deposit`, { amount, description });
    return data;
  },

  async getTransactions(params?: { page?: number; limit?: number; search?: string; startDate?: string; endDate?: string; type?: string }): Promise<GetTransactionsResponse> {
    const { data } = await api.get('/admin/transactions', { params });
    return data;
  },

  async getSettings(): Promise<SystemSetting[]> {
    const { data } = await api.get('/admin/settings');
    return data;
  },

  async updateSettings(updates: Record<string, any>): Promise<SystemSetting[]> {
    const { data } = await api.patch('/admin/settings', { updates });
    // Backend now returns { settings, oldValues, newValues } for audit purposes
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (data.settings ?? data) as SystemSetting[];
  },

  async getAdminAuditLogs(params?: GetAuditLogsParams): Promise<GetAdminAuditLogsResponse> {
    const { data } = await api.get('/audit-logs/admin', { params });
    return data;
  },

  async getCustomerAuditLogs(params?: GetAuditLogsParams): Promise<GetCustomerAuditLogsResponse> {
    const { data } = await api.get('/audit-logs/customer', { params });
    return data;
  }
};
