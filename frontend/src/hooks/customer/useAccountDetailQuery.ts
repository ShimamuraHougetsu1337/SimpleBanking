import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { accountService } from '@/services/account.service';
import type { AccountInfo } from '@/services/account.service';

export function useAccountDetailQuery(id?: string) {
  return useQuery<AccountInfo | null>({
    queryKey: queryKeys.accounts.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      return await accountService.getAccountDetail(id);
    },
    enabled: !!id,
  });
}
