import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { accountService } from '@/services/account.service';
import { transactionService } from '@/services/transaction.service';
import type { Transaction } from '@/components/customer/dashboard/recent-transactions/RecentTransactions';

export interface Account {
  id: string;
  accountNumber: string;
  name: string;
  balance: string;
  currency: string;
  theme?: string;
  status: string;
  createdAt: string;
  user?: {
    fullName: string;
  };
}

export const useDashboardData = () => {
  const { data: accountsData, isLoading: loadingAccounts, error: errorAccounts } = useQuery({
    queryKey: queryKeys.accounts.me(),
    queryFn: async () => {
      return await accountService.getAccountsMe() as unknown as Account[];
    },
  });

  const { data: txByAccountData, isLoading: loadingTx, error: errorTx } = useQuery({
    queryKey: queryKeys.dashboard.transactions(accountsData?.map((a: Account) => a.id)),
    queryFn: async () => {
      if (!accountsData || accountsData.length === 0) return {};

      const txPromises = accountsData.map((acc: Account) =>
        transactionService.getTransactions({ accountId: acc.id, limit: 5 })
      );

      const txResArray = await Promise.all(txPromises);

      const newTxByAccount: Record<string, Transaction[]> = {};
      accountsData.forEach((acc: Account, idx: number) => {
        const res = txResArray[idx] as { data?: Transaction[] } | undefined;
        if (res && res.data) {
          newTxByAccount[acc.id] = res.data;
        } else {
          newTxByAccount[acc.id] = [];
        }
      });
      return newTxByAccount;
    },
    enabled: !!accountsData && accountsData.length > 0,
  });

  const loading = loadingAccounts || loadingTx;
  const error = errorAccounts || errorTx;

  const accounts = accountsData || [];
  const transactionsByAccount = txByAccountData || {};

  return {
    accounts,
    transactionsByAccount,
    loading,
    error,
    hasAccountsLoaded: !!accountsData,
  };
};
