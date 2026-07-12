import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { accountService } from '@/services/account.service';

interface CreateAccountPayload {
  name: string;
  theme?: string;
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAccountPayload) => {
      return await accountService.createAccount({
        name: payload.name,
        theme: payload.theme || '',
      });
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh list
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}
