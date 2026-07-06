import { Card, Typography } from 'antd';
import type { Account } from '@/hooks/customer/useDashboardData';
import { AccountInfo } from './AccountInfo';
import { AccountQuickActions } from './AccountQuickActions';

const { Title } = Typography;

interface AccountDetailsCardProps {
  account: Account;
  onWithdraw?: (account: Account) => void;
  onSettings?: (account: Account) => void;
}

export function AccountDetailsCard({ account, onWithdraw, onSettings }: AccountDetailsCardProps) {

  return (
    <>
      <Card
        title={<Title level={4} style={{ margin: 0, color: '#1e293b' }}>Thông tin tài khoản</Title>}
        variant="borderless"
        styles={{ body: { padding: '24px' } }}
        style={{
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          transition: 'all 0.15s ease',
        }}
        className="account-details-card"
      >
        <AccountInfo account={account} />
        <AccountQuickActions account={account} onWithdraw={onWithdraw} onSettings={onSettings} />
      </Card>

      <style>{`
        .account-details-card:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </>
  );
}
