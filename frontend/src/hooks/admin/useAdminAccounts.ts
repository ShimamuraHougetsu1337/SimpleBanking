import { useState, useDeferredValue } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type AdminAccount } from '@/services/admin.service';
import { message } from 'antd';

export function useAdminAccounts() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminAccounts', { page, limit: pageSize, search: deferredSearchQuery }],
    queryFn: () =>
      adminService.getAccounts({
        page,
        limit: pageSize,
        search: deferredSearchQuery || undefined,
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 10000,
  });

  const freezeMutation = useMutation({
    mutationFn: (accountId: string) => adminService.updateAccountStatus(accountId, 'locked'),
    onSuccess: () => {
      message.success('Account frozen successfully');
      void queryClient.invalidateQueries({ queryKey: ['adminAccounts'] });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to freeze account';
      message.error(errMsg);
    },
  });

  const unfreezeMutation = useMutation({
    mutationFn: (accountId: string) => adminService.updateAccountStatus(accountId, 'active'),
    onSuccess: () => {
      message.success('Account unfrozen successfully');
      void queryClient.invalidateQueries({ queryKey: ['adminAccounts'] });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to unfreeze account';
      message.error(errMsg);
    },
  });

  const depositMutation = useMutation({
    mutationFn: ({ accountId, amount, description }: { accountId: string; amount: string; description?: string }) => 
      adminService.depositToAccount(accountId, amount, description),
    onSuccess: () => {
      message.success('Deposit successful');
      void queryClient.invalidateQueries({ queryKey: ['adminAccounts'] });
      void queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to deposit';
      message.error(errMsg);
    },
  });

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
  };

  const handleFreezeAccount = (accountId: string) => {
    freezeMutation.mutate(accountId);
  };

  const handleUnfreezeAccount = (accountId: string) => {
    unfreezeMutation.mutate(accountId);
  };

  const handleDeposit = (accountId: string, amount: string, description?: string) => {
    depositMutation.mutate({ accountId, amount, description });
  };

  return {
    accounts: data?.data ?? [],
    total: data?.meta?.total ?? 0,
    page,
    pageSize,
    searchQuery,
    handleSearchChange,
    handlePageChange,
    handleFreezeAccount,
    handleUnfreezeAccount,
    handleDeposit,
    isDepositing: depositMutation.isPending,
    isLoading,
    error,
  };
}
export type { AdminAccount };
