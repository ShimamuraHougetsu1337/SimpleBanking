import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import api from '../../services/api';
import { shouldRetryMutation } from '../../utils/retryUtils';

interface TransferPayload {
  from_accountId: string;
  to_accountNumber: string;
  amount: string;
  description?: string;
  idempotencyKey: string;
}

export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    retry: (failureCount, error) => shouldRetryMutation(failureCount, error, 2),
    retryDelay: (retryAttempt) => Math.min(1000 * 2 ** retryAttempt, 10000),
    mutationFn: async (payload: TransferPayload) => {
      const { idempotencyKey, ...body } = payload;
      const { data } = await api.post('/transactions/transfer', body, {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      });
      return data;
    },
    onSuccess: () => {
      // Invalidate both accounts and transactions to refresh balance and history
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
