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
    totalUsers: number;
    activeAccounts: number;
    lockedAccounts: number;
  };
}

export const adminService = {
  async getUsers(params?: GetUsersParams): Promise<GetUsersResponse> {
    const { data } = await api.get('/admin/users', { params });
    return data;
  },

  async updateUserStatus(id: string, status: 'active' | 'locked'): Promise<AdminUser> {
    const { data } = await api.patch(`/admin/users/${id}/status`, { status });
    return data;
  },
};
