import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { useState } from 'react';
import { App } from 'antd';
import { adminService } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/error';

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
}

export function useAdminTransactionRequests() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.transactionRequests.list(page, pageSize, statusFilter),
    queryFn: () => adminService.getTransactionRequests({
      page,
      limit: pageSize,
      status: statusFilter
    }),
  });

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

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage);
    if (newPageSize) setPageSize(newPageSize);
  };

  const handleStatusFilterChange = (status: string | undefined) => {
    setStatusFilter(status);
    setPage(1);
  };

  return {
    requests: data?.data || [],
    total: data?.total || 0,
    page,
    pageSize,
    statusFilter,
    handlePageChange,
    handleStatusFilterChange,
    isLoading,
    approveRequest: approveMutation.mutate,
    isApproving: approveMutation.isPending,
    rejectRequest: rejectMutation.mutate,
    isRejecting: rejectMutation.isPending,
  };
}
