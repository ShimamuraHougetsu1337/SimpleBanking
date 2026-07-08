import { useState, useDeferredValue } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { adminService, type AdminUser } from '@/services/admin.service';
import { message } from 'antd';

export function useAdminUsers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // Fetch paginated users from the admin API
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.users.list({ page, limit: pageSize, search: deferredSearchQuery, includeDeleted }),
    queryFn: () =>
      adminService.getUsers({
        page,
        limit: pageSize,
        search: deferredSearchQuery || undefined,
        includeDeleted,
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 10000,
  });

  // Mutation to lock user status
  const lockMutation = useMutation({
    mutationFn: (userId: string) => adminService.updateUserStatus(userId, 'locked'),
    onSuccess: () => {
      message.success('User locked successfully');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to lock user';
      message.error(errMsg);
    },
  });

  // Mutation to unlock user status
  const unlockMutation = useMutation({
    mutationFn: (userId: string) => adminService.updateUserStatus(userId, 'active'),
    onSuccess: () => {
      message.success('User unlocked successfully');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to unlock user';
      message.error(errMsg);
    },
  });

  // Mutation to soft delete user
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminService.softDeleteUser(userId),
    onSuccess: () => {
      message.success('User soft deleted successfully');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to delete user';
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

  const handleLockUser = (userId: string) => {
    lockMutation.mutate(userId);
  };

  const handleUnlockUser = (userId: string) => {
    unlockMutation.mutate(userId);
  };

  const handleDeleteUser = (userId: string) => {
    deleteMutation.mutate(userId);
  };


  return {
    users: data?.data ?? [],
    total: data?.meta?.total ?? 0,
    page,
    pageSize,
    searchQuery,
    includeDeleted,
    setIncludeDeleted,
    handleSearchChange,
    handlePageChange,
    handleLockUser,
    handleUnlockUser,
    handleDeleteUser,
    isLoading,
    error,
  };
}
export type { AdminUser };
