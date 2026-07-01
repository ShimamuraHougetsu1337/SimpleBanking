import { Card, Typography, Tag, Button, Space, Descriptions } from 'antd';
import { SwapOutlined, HistoryOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Account } from '@/hooks/client/useDashboardData';

const { Title, Text } = Typography;

interface AccountDetailsCardProps {
  account: Account;
}

export function AccountDetailsCard({ account }: AccountDetailsCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isLocked = account.status === 'locked';

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
        <Descriptions column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
          <Descriptions.Item label={<Text type="secondary">Tên tài khoản</Text>}>
            <Text strong style={{ color: '#1e293b' }}>{account.name}</Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Text type="secondary">Số tài khoản</Text>}>
            <Text
              strong
              copyable={{ text: account.accountNumber }}
              style={{ fontFamily: 'monospace', color: '#1e293b', fontSize: 15 }}
            >
              {account.accountNumber}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Text type="secondary">Trạng thái</Text>}>
            <Tag
              color={isLocked ? 'error' : 'success'}
              icon={<SafetyCertificateOutlined />}
              style={{ borderRadius: 4, fontWeight: 500 }}
            >
              {isLocked ? 'Đã khóa' : 'Đang hoạt động'}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label={<Text type="secondary">Loại tiền tệ</Text>}>
            <Text strong style={{ color: '#1e293b' }}>{account.currency}</Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Text type="secondary">Ngày mở</Text>}>
            <Text style={{ color: '#1e293b' }}>{formatDate(account.createdAt)}</Text>
          </Descriptions.Item>
        </Descriptions>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
          <Text type="secondary" strong style={{ display: 'block', marginBottom: 12, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Thao tác nhanh
          </Text>
          <Space size="middle" wrap>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => navigate('/transfer', { state: { fromAccountNumber: account.accountNumber } })}
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
          </Space>
        </div>
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
