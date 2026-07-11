import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { transactionService } from '@/services/transaction.service';
import { shouldRetryMutation } from '../../utils/retryUtils';

export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    retry: (failureCount, error) => shouldRetryMutation(failureCount, error, 2),
    retryDelay: (retryAttempt) => Math.min(1000 * 2 ** retryAttempt, 10000),
    mutationFn: transactionService.transfer,
    onSuccess: () => {
      // Invalidate both accounts and transactions to refresh balance and history
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
