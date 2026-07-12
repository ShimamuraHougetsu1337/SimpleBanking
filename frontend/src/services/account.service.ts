import api from './api';

export interface CreateAccountPayload {
  name: string;
  theme: string;
}

export interface UpdateAccountPayload {
  name: string;
  theme: string;
}

export interface AccountInfo {
  id: string;
  accountNumber: string;
  balance: string;
  name: string;
  theme: string;
  currency: string;
  user?: {
    fullName: string;
    email: string;
  };
  [key: string]: unknown;
}

export const accountService = {
  async getAccountsMe(): Promise<AccountInfo[]> {
    const { data } = await api.get('/accounts/me');
    return data;
  },

  async getAccountDetail(id: string): Promise<AccountInfo> {
    const { data } = await api.get(`/accounts/${id}`);
    return data;
  },

  async resolveAccountNumber(accountNumber: string): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/accounts/resolve/${accountNumber}`);
    return data;
  },

  async createAccount(payload: CreateAccountPayload): Promise<AccountInfo> {
    const { data } = await api.post('/accounts', payload);
    return data;
  },

  async updateAccount(accountId: string, payload: UpdateAccountPayload): Promise<AccountInfo> {
    const { data } = await api.patch(`/accounts/${accountId}`, payload);
    return data;
  },
};
