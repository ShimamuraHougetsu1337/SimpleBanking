import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { transactionService } from '@/services/transaction.service';
import { shouldRetryMutation } from '@/utils/retryUtils';

export function useWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    retry: (failureCount, error) => shouldRetryMutation(failureCount, error, 2),
    retryDelay: (retryAttempt) => Math.min(1000 * 2 ** retryAttempt, 10000),
    mutationFn: transactionService.withdraw,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.me() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.detail(variables.accountId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}