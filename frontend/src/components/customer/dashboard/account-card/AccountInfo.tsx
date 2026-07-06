import { Typography, Tag, Descriptions } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import type { Account } from '@/hooks/customer/useDashboardData';

const { Text } = Typography;

interface AccountInfoProps {
  account: Account;
}

export function AccountInfo({ account }: AccountInfoProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isLocked = account.status === 'locked';

  return (
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
  );
}
