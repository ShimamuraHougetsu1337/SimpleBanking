import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { adminService } from '@/services/admin.service';

export function useAdminTransactionRequestsQuery() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.transactionRequests.list(page, pageSize, statusFilter),
    queryFn: () => adminService.getTransactionRequests({
      page,
      limit: pageSize,
      status: statusFilter
    }),
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
  };
}
