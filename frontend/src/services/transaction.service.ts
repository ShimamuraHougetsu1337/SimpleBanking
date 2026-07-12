import api from './api';

export interface TransferPayload {
  from_accountId: string;
  to_accountNumber: string;
  amount: string;
  description?: string;
  idempotencyKey: string;
}

export interface WithdrawVariables {
  accountId: string;
  amount: number;
  description?: string;
  idempotencyKey: string;
}

export interface DepositVariables {
  accountId: string;
  amount: number;
  description?: string;
  idempotencyKey: string;
}

export const transactionService = {
  async transfer(payload: TransferPayload) {
    const { idempotencyKey, ...body } = payload;
    const { data } = await api.post('/transactions/transfer', body, {
      headers: {
        'X-Idempotency-Key': idempotencyKey,
      },
    });
    return data;
  },

  async withdraw(variables: WithdrawVariables) {
    const { idempotencyKey, ...body } = variables;
    const { data } = await api.post('/transactions/withdraw', body, {
      headers: {
        'X-Idempotency-Key': idempotencyKey,
      },
    });
    return data;
  },

  async deposit(variables: DepositVariables) {
    const { idempotencyKey, ...body } = variables;
    const { data } = await api.post('/transactions/deposit', body, {
      headers: {
        'X-Idempotency-Key': idempotencyKey,
      },
    });
    return data;
  },

  async verifyOtp(transactionId: string, code: string) {
    const { data } = await api.post(`/transactions/${transactionId}/verify-otp`, { code });
    return data;
  },

  async resendOtp(transactionId: string) {
    const { data } = await api.post(`/transactions/${transactionId}/resend-otp`);
    return data;
  },

  async getTransferFee(): Promise<{ fee: string }> {
    const { data } = await api.get('/transactions/transfer-fee');
    return data;
  },

  async getTransactions(params?: Record<string, string | number | undefined>): Promise<unknown> {
    const { data } = await api.get('/transactions', { params });
    return data;
  },
};
