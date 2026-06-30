import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { message } from 'antd';
import { v4 as uuidv4 } from 'uuid';

interface WithdrawVariables {
  accountId: string;
  amount: number;
  description?: string;
}

export function useWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: WithdrawVariables) => {
      const payload = {
        ...variables,
        idempotencyKey: uuidv4(),
      };
      const res = await api.post('/transactions/withdraw', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      message.success('Withdrawal successful!');
      queryClient.invalidateQueries({ queryKey: ['accounts', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['account', variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'transactions'] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to withdraw money';
      message.error(typeof msg === 'string' ? msg : msg[0]);
    },
  });
}
