import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { accountService } from '@/services/account.service';

interface UpdateAccountPayload {
  name?: string;
  theme?: string;
}

export function useUpdateAccount(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateAccountPayload) => {
      return await accountService.updateAccount(accountId, {
        name: payload.name || '',
        theme: payload.theme || '',
      });
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}
