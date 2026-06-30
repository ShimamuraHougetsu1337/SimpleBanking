import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Empty, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

import { AccountQuickActions } from '@/components/account/AccountQuickActions';
import { AccountSettingsForm } from '@/components/account/AccountSettingsForm';
import { AccountTransactions } from '@/components/account/AccountTransactions';
import { DepositModal, WithdrawModal } from '@/components/transactions/TransactionModals';

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const { data: account, isLoading: accountLoading, refetch: refetchAccount } = useQuery({
    queryKey: ['account', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/accounts/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (accountLoading) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  if (!account) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Empty description="Account not found" />
        <Button type="primary" onClick={() => navigate(-1)} style={{ marginTop: 20 }}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ textAlign: 'left', marginBottom: 20 }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ padding: 0 }}
        >
          Back
        </Button>
      </div>

      <AccountQuickActions 
        onDeposit={() => setDepositOpen(true)}
        onWithdraw={() => setWithdrawOpen(true)}
      />

      <AccountSettingsForm 
        accountId={id as string}
        initialValues={{ name: account.name, theme: account.theme || 'linear-gradient(135deg, #111827 0%, #000000 100%)' }}
        onSuccess={() => refetchAccount()}
      />

      <AccountTransactions accountId={id as string} />

      <DepositModal 
        isOpen={depositOpen} 
        onClose={() => setDepositOpen(false)} 
        accountId={id as string} 
      />
      
      <WithdrawModal 
        isOpen={withdrawOpen} 
        onClose={() => setWithdrawOpen(false)} 
        accountId={id as string} 
      />
    </div>
  );
}
