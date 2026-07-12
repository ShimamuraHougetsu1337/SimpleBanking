import { useAdminTransactionRequestsQuery } from './useAdminTransactionRequestsQuery';
import { useAdminTransactionRequestsActions } from './useAdminTransactionRequestsActions';

export interface AdminTransactionRequest {
  id: string;
  type: string;
  amount: string;
  status: string;
  description: string;
  accountNumber: string;
  userName: string;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectionReason?: string | null;
}

export function useAdminTransactionRequests() {
  const queryData = useAdminTransactionRequestsQuery();
  const actionData = useAdminTransactionRequestsActions();

  return {
    ...queryData,
    ...actionData,
  };
}
