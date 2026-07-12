import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { accountService } from '@/services/account.service';
import type { Account } from '@/types/account';

export function useAccountDetailQuery(id?: string) {
  return useQuery<Account | null>({
    queryKey: queryKeys.accounts.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      return await accountService.getAccountDetail(id);
    },
    enabled: !!id,
  });
}
