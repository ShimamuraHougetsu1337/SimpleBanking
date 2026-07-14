import api from './api';
import type {
  AdminUser,
  GetUsersParams,
  GetUsersResponse,
  AdminAccount,
  GetAccountsResponse,
  GetTransactionsResponse,
  DashboardStats,
  SystemSetting,
  UserHistoryRecord,
  GetLedgerResponse,
  GetAuditLogsParams,
  GetAdminAuditLogsResponse,
  GetCustomerAuditLogsResponse,
  AdminTransactionRequest,
  GetReconciliationReportsResponse,
  ReconciliationReport,
} from '@/types/admin';

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

  async getAccounts(params?: { page?: number; limit?: number; search?: string; status?: string; type?: 'customer' | 'system' | 'all' }): Promise<GetAccountsResponse> {
    const { data } = await api.get('/admin/accounts', { params });
    return data;
  },

  async updateAccountStatus(id: string, status: 'active' | 'locked'): Promise<AdminAccount> {
    const { data } = await api.patch(`/admin/accounts/${id}/status`, { status });
    return data;
  },

  async depositToAccount(id: string, amount: string, description?: string): Promise<unknown> {
    const { data } = await api.post(`/admin/accounts/${id}/deposit`, { amount, description });
    return data;
  },

  async withdrawFromAccount(id: string, amount: string, description?: string): Promise<unknown> {
    const { data } = await api.post(`/admin/accounts/${id}/withdraw`, { amount, description });
    return data;
  },

  async transferFromAccount(id: string, toAccountNumber: string, amount: string, description?: string): Promise<unknown> {
    const { data } = await api.post(`/admin/accounts/${id}/transfer`, { toAccountNumber, amount, description });
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

  async updateSettings(updates: Record<string, unknown>): Promise<SystemSetting[]> {
    const { data } = await api.patch('/admin/settings', { updates });
    // Backend now returns { settings, oldValues, newValues } for audit purposes
    const settingsData = (data as { settings?: SystemSetting[] }).settings ?? data;
    return settingsData as SystemSetting[];
  },

  async reverseTransaction(id: string) {
    const response = await api.post(`/transactions/${id}/reverse`);
    return response.data;
  },

  async getUserHistory(id: string): Promise<UserHistoryRecord[]> {
    const response = await api.get(`/admin/users/${id}/history`);
    return response.data;
  },

  async softDeleteUser(id: string) {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  async getAccountLedger(id: string, page = 1, limit = 50): Promise<GetLedgerResponse> {
    const response = await api.get(`/admin/accounts/${id}/ledger`, {
      params: { page, limit },
    });
    return response.data;
  },

  async getAdminAuditLogs(params?: GetAuditLogsParams): Promise<GetAdminAuditLogsResponse> {
    const { data } = await api.get('/audit-logs/admin', { params });
    return data;
  },

  async getCustomerAuditLogs(params?: GetAuditLogsParams): Promise<GetCustomerAuditLogsResponse> {
    const { data } = await api.get('/audit-logs/customer', { params });
    return data;
  },

  async getTransactionRequests(params?: { page?: number; limit?: number; status?: string }): Promise<{ data: AdminTransactionRequest[]; total: number }> {
    const { data } = await api.get('/admin/transaction-requests', { params });
    return data;
  },

  async approveTransactionRequest(id: string): Promise<unknown> {
    const { data } = await api.post(`/admin/transaction-requests/${id}/approve`);
    return data;
  },

  async rejectTransactionRequest({ id, rejectionReason }: { id: string; rejectionReason: string }): Promise<unknown> {
    const { data } = await api.post(`/admin/transaction-requests/${id}/reject`, { rejectionReason });
    return data;
  },

  async createUser(payload: Record<string, unknown>): Promise<unknown> {
    const { data } = await api.post('/admin/users', payload);
    return data;
  },

  async reactivateOtp(id: string): Promise<unknown> {
    const response = await api.post(`/admin/users/${id}/reactivate-otp`);
    return response.data;
  },

  async updateDailyLimit(id: string, dailyLimit: string | null): Promise<unknown> {
    const response = await api.patch(`/admin/accounts/${id}/daily-limit`, { dailyLimit });
    return response.data;
  },

  async getReconciliationReports(params?: { page?: number; limit?: number }): Promise<GetReconciliationReportsResponse> {
    const { data } = await api.get('/admin/reconciliation/reports', { params });
    return data;
  },

  async triggerReconciliation(): Promise<ReconciliationReport> {
    const { data } = await api.post('/admin/reconciliation/trigger');
    return data;
  }
};
