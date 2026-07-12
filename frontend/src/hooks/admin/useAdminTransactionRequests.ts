import { useAdminTransactionRequestsQuery } from './useAdminTransactionRequestsQuery';
import { useAdminTransactionRequestsActions } from './useAdminTransactionRequestsActions';
import type { AdminTransactionRequest } from '@/types/admin';

export function useAdminTransactionRequests() {
  const queryData = useAdminTransactionRequestsQuery();
  const actionData = useAdminTransactionRequestsActions();

  return {
    ...queryData,
    ...actionData,
  };
}

export type { AdminTransactionRequest };
