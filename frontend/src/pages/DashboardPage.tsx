import { Typography, Spin, Alert } from 'antd';
import { useState, useEffect } from 'react';
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
  user?: {
    fullName: string;
  };
}

const MOCK_THEMES = [
  'linear-gradient(135deg, #111827 0%, #000000 100%)', // Default Black Metallic
  'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)', // Ocean Blue
  'linear-gradient(135deg, #064e3b 0%, #047857 100%)', // Emerald Green
  'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)', // Royal Purple
];

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactionsByAccount, setTransactionsByAccount] = useState<Record<string, Transaction[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const accRes = await api.get('/accounts/me');
        
        if (accRes.data) {
          setAccounts(accRes.data);
          
          // Fetch recent transactions for each account
          const txPromises = accRes.data.map((acc: Account) => 
            api.get(`/transactions`, { params: { accountId: acc.id, limit: 5 } })
          );
          
          const txResArray = await Promise.all(txPromises);
          
          const newTxByAccount: Record<string, Transaction[]> = {};
          accRes.data.forEach((acc: Account, idx: number) => {
            if (txResArray[idx].data && txResArray[idx].data.data) {
              newTxByAccount[acc.id] = txResArray[idx].data.data;
            } else {
              newTxByAccount[acc.id] = [];
            }
          });
          
          setTransactionsByAccount(newTxByAccount);
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }
  
  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon style={{ margin: '20px' }} />;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Overview</Title>
      </div>

      <div style={{ marginBottom: 32 }}>
        {accounts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {accounts.map((account, index) => {
              const themeGradient = MOCK_THEMES[index % MOCK_THEMES.length];
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
