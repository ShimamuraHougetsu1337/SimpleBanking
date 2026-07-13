import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { adminService } from '@/services/admin.service';
import { message } from 'antd';

import { AxiosError } from 'axios';

export function useAdminReconciliation() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.reconciliation.list({ page, limit: pageSize }),
    queryFn: () => adminService.getReconciliationReports({ page, limit: pageSize }),
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });

  const triggerMutation = useMutation({
    mutationFn: () => adminService.triggerReconciliation(),
    onSuccess: (report) => {
      if (report.status === 'MISMATCH') {
        message.error(`Đối soát hoàn tất: Phát hiện ${report.mismatchCount} tài khoản bị lệch số dư!`);
      } else {
        message.success('Đối soát hoàn tất: Số dư tất cả tài khoản khớp hoàn toàn.');
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.reconciliation.all });
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<{ message?: string }>;
      const errMsg = axiosError.response?.data?.message || 'Không thể kích hoạt đối soát';
      message.error(errMsg);
    },
  });

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
  };

  const reports = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return {
    reports,
    total,
    page,
    pageSize,
    isLoading,
    error,
    isTriggering: triggerMutation.isPending,
    triggerReconciliation: () => triggerMutation.mutate(),
    handlePageChange,
  };
}
