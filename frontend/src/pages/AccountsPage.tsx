import { Typography, Button, Spin, Empty, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

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

export default function AccountsPage() {
  const navigate = useNavigate();

  const { data: accounts, isLoading, error } = useQuery<Account[]>({
    queryKey: ['accounts', 'me'],
    queryFn: async () => {
      const res = await api.get('/accounts/me');
      return res.data;
    },
  });

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error loading accounts" type="error" showIcon style={{ margin: '20px' }} />;
  }

  const accountList = accounts || [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>My Accounts</Title>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          size="large"
          style={{ borderRadius: 8 }}
        >
          Open New Account
        </Button>
      </div>

      {accountList.length === 0 ? (
        <Empty description="You don't have any accounts yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 20 }}>
          {accountList.map((account) => {
            const themeGradient = account.theme || 'linear-gradient(135deg, #111827 0%, #000000 100%)';
            return (
              <div key={account.id}>
                <div
                  onClick={() => navigate(`/accounts/${account.id}`)}
                  style={{ cursor: 'pointer', padding: '0 10px' }}
                >
                  <BalanceCard
                    accountNumber={account.accountNumber}
                    name={account.name}
                    balance={Number(account.balance)}
                    owner={account.user?.fullName || 'Valued Customer'}
                    currency={account.currency}
                    themeGradient={themeGradient}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
