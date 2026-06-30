import { Typography, Spin, Alert } from 'antd';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { RecentTransactions, type Transaction } from '@/components/dashboard/RecentTransactions';

const { Title } = Typography;

interface Account {
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

export default function DashboardPage() {
  const { data: accountsData, isLoading: loadingAccounts, error: errorAccounts } = useQuery({
    queryKey: ['accounts', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/accounts/me');
      return data;
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

  if (loading && !accountsData) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error" description="Failed to load dashboard data." type="error" showIcon style={{ margin: '20px' }} />;
  }

  const accounts = accountsData || [];
  const transactionsByAccount = txByAccountData || {};

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Overview</Title>
      </div>

      <div style={{ marginBottom: 32 }}>
        {accounts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {accounts.map((account: Account) => {
              const themeGradient = account.theme || 'linear-gradient(135deg, #111827 0%, #000000 100%)';
              const accountTransactions = transactionsByAccount[account.id] || [];

              return (
                <div key={account.id}>
                  <div style={{ marginBottom: 24 }}>
                    <BalanceCard
                      accountNumber={account.accountNumber}
                      name={account.name}
                      balance={Number(account.balance)}
                      owner={account.user?.fullName || 'User'}
                      currency={account.currency}
                      themeGradient={themeGradient}
                    />
                  </div>
                  <RecentTransactions
                    transactions={accountTransactions}
                    viewAllLink={`/accounts/${account.id}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div>No accounts found.</div>
        )}
      </div>
    </div>
  );
}
