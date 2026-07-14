import { Table, Typography, Tag, Space, ConfigProvider, Button, Tooltip } from 'antd';
import { LockOutlined, UnlockOutlined, DollarOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { AdminAccount } from '@/types/admin';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/roles';

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
  onOpenTransactionModal: (account: AdminAccount) => void;
  onOpenLimitModal?: (account: AdminAccount) => void;
  isSystemTab?: boolean;
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
  onOpenTransactionModal,
  onOpenLimitModal,
  isSystemTab = false,
}: AdminAccountTableProps) => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const canDeposit = currentUser?.role === UserRole.TELLER || currentUser?.role === UserRole.MANAGER;

  const columns = [
    {
      title: 'Số tài khoản',
      key: 'accountNumber',
      align: 'center' as const,
      render: (record: AdminAccount) => (
        <Text copyable strong style={{ color: '#1e293b' }}>{record.accountNumber}</Text>
      ),
    },
    {
      title: 'Chủ tài khoản',
      key: 'owner',
      align: 'center' as const,
      render: (record: AdminAccount) => (
        <Space orientation="vertical" size={0} align="center">
          <Text strong style={{ color: '#1e293b' }}>{record.ownerName}</Text>
          <Text type="secondary" style={{ fontSize: 13, color: '#64748b' }}>{record.ownerEmail}</Text>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => (
        <Tag variant="filled" color={status === 'active' ? 'success' : 'error'} style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Số dư',
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
      title: 'Số dư tạm giữ',
      dataIndex: 'holdBalance',
      key: 'holdBalance',
      align: 'center' as const,
      render: (holdBalance: string) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#dc2626' }}>
          {formatVND(holdBalance || '0')}
        </Text>
      ),
    },
    {
      title: 'Hạn mức ngày',
      key: 'dailyLimit',
      align: 'center' as const,
      render: (record: AdminAccount) => (
        <Space size={4} direction="vertical" align="center">
          <Text style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#1e293b', fontWeight: 500 }}>
            {record.dailyLimit ? formatVND(record.dailyLimit) : 'Mặc định'}
          </Text>
          {onOpenLimitModal && !isSystemTab && (
            <Button
              type="link"
              size="small"
              onClick={() => onOpenLimitModal(record)}
              style={{ padding: 0, fontSize: 12 }}
            >
              Chỉnh sửa
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: 'Ngày tạo',
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
      title: 'Hành động',
      key: 'action',
      align: 'center' as const,
      render: (record: AdminAccount) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <Button
            type="text"
            icon={<BookOutlined />}
            onClick={() => navigate(`/admin/accounts/${record.id}/ledger`)}
            style={{ color: '#8B5CF6' }}
          >
            Sổ cái
          </Button>
          {!isSystemTab && (
            <>
              {canDeposit && (
                <Button
                  type="text"
                  icon={<DollarOutlined />}
                  onClick={() => onOpenTransactionModal(record)}
                  style={{ color: '#10B981' }}
                  disabled={record.status !== 'active'}
                >
                  Giao dịch
                </Button>
              )}
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
                      Khóa
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
                  Khóa
                </Button>
              ) : (
                <Button
                  type="text"
                  style={{ color: '#3B82F6', display: 'inline-flex', alignItems: 'center' }}
                  icon={<UnlockOutlined />}
                  onClick={() => onUnfreezeAccount(record.id)}
                >
                  Mở khóa
                </Button>
              )}
            </>
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
