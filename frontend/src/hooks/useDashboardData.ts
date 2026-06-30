import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import type { Transaction } from '@/components/dashboard/RecentTransactions';

export interface Account {
  id: string;
  accountNumber: string;
  name: string;
  balance: string;
  currency: string;
  theme?: string;
  user?: {
    fullName: string;
  };
}

export const useDashboardData = () => {
  const { data: accountsData, isLoading: loadingAccounts, error: errorAccounts } = useQuery({
    queryKey: ['accounts', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/accounts/me');
      return data as Account[];
    },
  });

  const { data: txByAccountData, isLoading: loadingTx, error: errorTx } = useQuery({
    queryKey: ['dashboard', 'transactions', accountsData?.map((a: Account) => a.id)],
    queryFn: async () => {
      if (!accountsData || accountsData.length === 0) return {};

      const txPromises = accountsData.map((acc: Account) =>
        api.get(`/transactions`, { params: { accountId: acc.id, limit: 5 } })
      );

      const txResArray = await Promise.all(txPromises);

      const newTxByAccount: Record<string, Transaction[]> = {};
      accountsData.forEach((acc: Account, idx: number) => {
        if (txResArray[idx].data && txResArray[idx].data.data) {
          newTxByAccount[acc.id] = txResArray[idx].data.data;
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
