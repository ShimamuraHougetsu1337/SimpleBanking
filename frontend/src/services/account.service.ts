import api from './api';
import type { Account, CreateAccountPayload, UpdateAccountPayload } from '@/types/account';

export const accountService = {
  async getAccountsMe(): Promise<Account[]> {
    const { data } = await api.get('/accounts/me');
    return data;
  },

  async getAccountDetail(id: string): Promise<Account> {
    const { data } = await api.get(`/accounts/${id}`);
    return data;
  },

  async resolveAccountNumber(accountNumber: string): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/accounts/resolve/${accountNumber}`);
    return data;
  },

  async createAccount(payload: CreateAccountPayload): Promise<Account> {
    const { data } = await api.post('/accounts', payload);
    return data;
  },

  async updateAccount(accountId: string, payload: UpdateAccountPayload): Promise<Account> {
    const { data } = await api.patch(`/accounts/${accountId}`, payload);
    return data;
  },
};
