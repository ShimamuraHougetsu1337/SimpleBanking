import { useState, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { adminService, type AdminTransaction } from '@/services/admin.service';

export function useAdminTransactions() {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null] | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const startDateStr = dateRange?.[0] ? dateRange[0].toISOString() : undefined;
  const endDateStr = dateRange?.[1] ? dateRange[1].toISOString() : undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.transactions.list({ page, limit: pageSize, search: deferredSearchQuery, startDate: startDateStr, endDate: endDateStr, type: typeFilter }),
    queryFn: () =>
      adminService.getTransactions({
        page,
        limit: pageSize,
        search: deferredSearchQuery || undefined,
        startDate: startDateStr,
        endDate: endDateStr,
        type: typeFilter === 'all' ? undefined : typeFilter,
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 10000,
  });

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1); // Reset page
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setPage(1); // Reset page
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0].toDate(), dates[1].toDate()]);
    } else {
      setDateRange(null);
    }
    setPage(1); // Reset page
  };

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
  };

  const transactions = data?.data ?? [];

  return {
    transactions,
    total: data?.meta?.total ?? 0,
    page,
    pageSize,
    searchQuery,
    typeFilter,
    dateRange,
    handleSearchChange,
    handleTypeFilterChange,
    handleDateRangeChange,
    handlePageChange,
    stats: {
      totalVolume: data?.meta?.totalVolume ?? '0',
      successfulCount: data?.meta?.successfulCount ?? 0,
      failedCount: data?.meta?.failedCount ?? 0,
    },
    isLoading,
    error,
  };
}
export type { AdminTransaction };
