import { Typography, Spin, Alert } from 'antd';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { useDashboardData, type Account } from '@/hooks/useDashboardData';

const { Title } = Typography;

export default function DashboardPage() {
  const {
    accounts,
    transactionsByAccount,
    loading,
    error,
    hasAccountsLoaded,
  } = useDashboardData();

  if (loading && !hasAccountsLoaded) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error" description="Failed to load dashboard data." type="error" showIcon style={{ margin: '20px' }} />;
  }

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
