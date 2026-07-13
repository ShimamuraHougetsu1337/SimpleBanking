import { useState, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { adminService } from '@/services/admin.service';

export function useAdminUsersQuery() {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [roleGroup, setRoleGroup] = useState<'customer' | 'staff'>('customer');

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.users.list({ page, limit: pageSize, search: deferredSearchQuery, includeDeleted, roleGroup }),
    queryFn: () =>
      adminService.getUsers({
        page,
        limit: pageSize,
        search: deferredSearchQuery || undefined,
        includeDeleted,
        roleGroup,
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 10000,
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

  const handleRoleGroupChange = (value: 'customer' | 'staff') => {
    setRoleGroup(value);
    setPage(1);
  };

  return {
    users: data?.data ?? [],
    total: data?.meta?.total ?? 0,
    page,
    pageSize,
    searchQuery,
    includeDeleted,
    setIncludeDeleted,
    roleGroup,
    handleSearchChange,
    handlePageChange,
    handleRoleGroupChange,
    isLoading,
    error,
  };
}
