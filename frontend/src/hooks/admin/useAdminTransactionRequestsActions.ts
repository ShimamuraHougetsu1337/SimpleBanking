import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { App } from 'antd';
import { adminService } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/error';

export function useAdminTransactionRequestsActions() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const approveMutation = useMutation({
    mutationFn: adminService.approveTransactionRequest,
    onSuccess: () => {
      message.success('Transaction request approved successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.transactionRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.transactions.all });
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    }
  });

  const rejectMutation = useMutation({
    mutationFn: adminService.rejectTransactionRequest,
    onSuccess: () => {
      message.success('Transaction request rejected');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.transactionRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.accounts.all });
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    }
  });

  return {
    approveRequest: approveMutation.mutate,
    isApproving: approveMutation.isPending,
    rejectRequest: rejectMutation.mutate,
    isRejecting: rejectMutation.isPending,
  };
}
