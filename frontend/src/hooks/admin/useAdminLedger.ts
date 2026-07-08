import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';

export function useAdminLedger(accountId: string | undefined) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'ledger', accountId, page, pageSize],
    queryFn: () => adminService.getAccountLedger(accountId!, page, pageSize),
    enabled: !!accountId,
    placeholderData: (previousData) => previousData,
  });

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
  };

  return {
    ledgerEntries: data?.data ?? [],
    total: data?.meta?.total ?? 0,
    page,
    pageSize,
    handlePageChange,
    isLoading,
    error,
  };
}
