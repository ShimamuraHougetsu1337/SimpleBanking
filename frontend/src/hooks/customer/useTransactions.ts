import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { transactionService } from '@/services/transaction.service';
import type { TransactionRecord } from '@/types/transaction';

export interface UseTransactionsParams {
  page?: number;
  limit?: number;
  accountId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface TransactionsResponse {
  data: TransactionRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useTransactions(params: UseTransactionsParams = {}) {
  return useQuery<TransactionsResponse>({
    queryKey: queryKeys.transactions.list(params),
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

      return await transactionService.getTransactions(queryParams) as TransactionsResponse;
    },
    placeholderData: keepPreviousData,
  });
}
