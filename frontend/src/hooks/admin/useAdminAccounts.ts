import { useAdminAccountsQuery } from './useAdminAccountsQuery';
import { useAdminAccountsActions } from './useAdminAccountsActions';
import type { AdminAccount } from '@/types/admin';

export function useAdminAccounts() {
  const queryData = useAdminAccountsQuery();
  const actionData = useAdminAccountsActions();

  return {
    ...queryData,
    ...actionData,
  };
}

export type { AdminAccount };
