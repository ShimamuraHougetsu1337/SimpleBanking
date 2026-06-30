import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

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
      const queryParams: any = {
        page: params.page || 1,
        limit: params.limit || 10,
      };

      if (params.accountId) queryParams.accountId = params.accountId;
      if (params.search) queryParams['filter[search]'] = params.search;
      if (params.fromDate) queryParams['filter[fromDate]'] = params.fromDate;
      if (params.toDate) queryParams['filter[toDate]'] = params.toDate;

      const { data } = await api.get('/transactions', { params: queryParams });
      return data;
    },
  });
}
