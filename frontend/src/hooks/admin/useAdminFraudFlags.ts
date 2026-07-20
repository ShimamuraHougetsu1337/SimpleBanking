import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { fraudService } from '@/services/fraud.service';
import { message } from 'antd';
import { AxiosError } from 'axios';

export function useAdminFraudFlags() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | undefined>('pending_review');

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.fraudFlags.list({ page, limit: pageSize, status: statusFilter }),
    queryFn: () => fraudService.getFraudFlags({ page, limit: pageSize, status: statusFilter }),
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { status: 'approved' | 'rejected'; reviewNote?: string; lockAccount?: boolean };
    }) => fraudService.reviewFraudFlag(id, payload),
    onSuccess: (_, variables) => {
      if (variables.payload.status === 'approved') {
        message.success('Đã xác minh và phê duyệt giao dịch bình thường.');
      } else {
        message.warning('Đã ghi nhận gian lận và xử lý từ chối/khóa.');
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.fraudFlags.all });
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<{ message?: string }>;
      const errMsg = axiosError.response?.data?.message || 'Không thể cập nhật kết quả xem xét';
      message.error(errMsg);
    },
  });

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage);
    if (newPageSize) setPageSize(newPageSize);
  };

  const handleStatusFilterChange = (status: string | undefined) => {
    setStatusFilter(status);
    setPage(1);
  };

  const flags = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return {
    flags,
    total,
    page,
    pageSize,
    statusFilter,
    isLoading,
    error,
    isReviewing: reviewMutation.isPending,
    reviewFraudFlag: (
      id: string,
      payload: { status: 'approved' | 'rejected'; reviewNote?: string; lockAccount?: boolean },
    ) => reviewMutation.mutate({ id, payload }),
    handlePageChange,
    handleStatusFilterChange,
  };
}
