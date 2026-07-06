import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { v4 as uuidv4 } from 'uuid';
import { shouldRetryMutation } from '@/utils/retryUtils';

interface WithdrawVariables {
  accountId: string;
  amount: number;
  description?: string;
}

export function useWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    retry: (failureCount, error) => shouldRetryMutation(failureCount, error, 2),
    retryDelay: (retryAttempt) => Math.min(1000 * 2 ** retryAttempt, 10000),
    mutationFn: async (variables: WithdrawVariables) => {
      const payload = {
        ...variables,
        idempotencyKey: uuidv4(),
      };
      const res = await api.post('/transactions/withdraw', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accounts', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['account', variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'transactions'] });
    },
  });
}
