import { Typography, Button, Spin, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/accounts/me')
      .then(res => {
        setAccounts(res.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

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

      {accounts.length === 0 ? (
        <Empty description="You don't have any accounts yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 20 }}>
          {accounts.map((account, index) => {
            const themeGradient = MOCK_THEMES[index % MOCK_THEMES.length];
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
