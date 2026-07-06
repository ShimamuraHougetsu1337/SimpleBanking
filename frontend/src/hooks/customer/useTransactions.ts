import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../../services/api';

export interface UseTransactionsParams {
  page?: number;
  limit?: number;
  accountId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export function useTransactions(params: UseTransactionsParams = {}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      // Send all filter fields as flat top-level query params so NestJS
      // ValidationPipe can whitelist and parse them without bracket notation issues.
      const queryParams: Record<string, string | number> = {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      };

      if (params.accountId) queryParams.accountId = params.accountId;
      if (params.search) queryParams.search = params.search;
      if (params.fromDate) queryParams.fromDate = params.fromDate;
      if (params.toDate) queryParams.toDate = params.toDate;

      const { data } = await api.get('/transactions', { params: queryParams });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
