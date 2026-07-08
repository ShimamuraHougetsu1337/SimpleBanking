import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import api from '@/services/api';
import { v4 as uuidv4 } from 'uuid';
import { shouldRetryMutation } from '@/utils/retryUtils';

interface DepositVariables {
  accountId: string;
  amount: number;
  description?: string;
}

export function useDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    retry: (failureCount, error) => shouldRetryMutation(failureCount, error, 2),
    retryDelay: (retryAttempt) => Math.min(1000 * 2 ** retryAttempt, 10000),
    mutationFn: async (variables: DepositVariables) => {
      const idempotencyKey = uuidv4();
      const res = await api.post('/transactions/deposit', variables, {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.me() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.detail(variables.accountId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
