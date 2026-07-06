import { Typography, Button, Space } from 'antd';
import { SwapOutlined, HistoryOutlined, MinusCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Account } from '@/hooks/customer/useDashboardData';

const { Text } = Typography;

interface AccountQuickActionsProps {
  account: Account;
  onWithdraw?: (account: Account) => void;
  onSettings?: (account: Account) => void;
}

export function AccountQuickActions({ account, onWithdraw, onSettings }: AccountQuickActionsProps) {
  const navigate = useNavigate();
  const isLocked = account.status === 'locked';

  return (
    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
      <Text type="secondary" strong style={{ display: 'block', marginBottom: 12, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Thao tác nhanh
      </Text>
      <Space size="middle" wrap>
        <Button
          type="primary"
          icon={<SwapOutlined />}
          onClick={() => navigate('/transfer', { state: { fromAccountId: account.id } })}
          disabled={isLocked}
          style={{
            backgroundColor: '#3B82F6',
            borderRadius: 6,
            fontWeight: 500,
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          Chuyển tiền
        </Button>
        <Button
          danger
          icon={<MinusCircleOutlined />}
          onClick={() => onWithdraw?.(account)}
          disabled={isLocked}
          style={{
            borderRadius: 6,
            fontWeight: 500,
          }}
        >
          Rút tiền
        </Button>
        <Button
          icon={<HistoryOutlined />}
          onClick={() => navigate(`/accounts/${account.id}`)}
          style={{
            borderRadius: 6,
            fontWeight: 500,
            color: '#475569',
            borderColor: '#cbd5e1',
          }}
        >
          Xem lịch sử
        </Button>
        <Button
          icon={<SettingOutlined />}
          onClick={() => onSettings?.(account)}
          style={{
            borderRadius: 6,
            fontWeight: 500,
            color: '#475569',
            borderColor: '#cbd5e1',
          }}
        >
          Cài đặt
        </Button>
      </Space>
    </div>
  );
}
