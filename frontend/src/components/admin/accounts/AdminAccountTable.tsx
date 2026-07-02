import { Table, Typography, Tag, Space, ConfigProvider, Button, Tooltip } from 'antd';
import { LockOutlined, UnlockOutlined, DollarOutlined } from '@ant-design/icons';
import type { AdminAccount } from '@/services/admin.service';

const { Text } = Typography;

const formatVND = (amount: string) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
};

interface AdminAccountTableProps {
  accounts: AdminAccount[];
  page: number;
  pageSize: number;
  total: number;
  isLoading: boolean;
  onPageChange: (page: number, pageSize: number) => void;
  onFreezeAccount: (id: string) => void;
  onUnfreezeAccount: (id: string) => void;
  onOpenDepositModal: (account: AdminAccount) => void;
}

export const AdminAccountTable = ({
  accounts,
  page,
  pageSize,
  total,
  isLoading,
  onPageChange,
  onFreezeAccount,
  onUnfreezeAccount,
  onOpenDepositModal,
}: AdminAccountTableProps) => {
  const columns = [
    {
      title: 'Account Number',
      key: 'accountNumber',
      align: 'center' as const,
      render: (record: AdminAccount) => (
        <Text copyable strong style={{ color: '#1e293b' }}>{record.accountNumber}</Text>
      ),
    },
    {
      title: 'Owner',
      key: 'owner',
      align: 'center' as const,
      render: (record: AdminAccount) => (
        <Space direction="vertical" size={0} align="center">
          <Text strong style={{ color: '#1e293b' }}>{record.ownerName}</Text>
          <Text type="secondary" style={{ fontSize: 13, color: '#64748b' }}>{record.ownerEmail}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => (
        <Tag bordered={false} color={status === 'active' ? 'success' : 'error'} style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      align: 'center' as const,
      render: (balance: string) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#1e293b' }}>
          {formatVND(balance)}
        </Text>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      align: 'center' as const,
      render: (date: string) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#64748b' }}>
          {new Date(date).toLocaleDateString('vi-VN')}
        </Text>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center' as const,
      render: (record: AdminAccount) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <Button
            type="text"
            icon={<DollarOutlined />}
            onClick={() => onOpenDepositModal(record)}
            style={{ color: '#10B981' }}
            disabled={record.status !== 'active'}
          >
            Deposit
          </Button>
          {record.ownerEmail === 'admin@gmail.com' ? (
            <Tooltip title="Không thể thực hiện thao tác này">
              <span>
                <Button
                  danger
                  type="text"
                  disabled
                  icon={<LockOutlined />}
                  style={{ display: 'inline-flex', alignItems: 'center', pointerEvents: 'none' }}
                >
                  Lock
                </Button>
              </span>
            </Tooltip>
          ) : record.status === 'active' ? (
            <Button
              danger
              type="text"
              icon={<LockOutlined />}
              onClick={() => onFreezeAccount(record.id)}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              Lock
            </Button>
          ) : (
            <Button
              type="text"
              style={{ color: '#3B82F6', display: 'inline-flex', alignItems: 'center' }}
              icon={<UnlockOutlined />}
              onClick={() => onUnfreezeAccount(record.id)}
            >
              Unlock
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            headerBg: '#F8FAFC',
            headerColor: '#64748b',
            headerSplitColor: 'transparent',
            rowHoverBg: '#F8FAFC',
            cellPaddingBlock: 16,
            cellPaddingInline: 20,
          },
        },
      }}
    >
      <Table
        columns={columns}
        dataSource={accounts}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          onChange: onPageChange,
        }}
      />
    </ConfigProvider>
  );
};
