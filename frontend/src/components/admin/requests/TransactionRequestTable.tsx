import { Table, Tag, Space, Button, Tooltip, Popconfirm, ConfigProvider, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { AdminTransactionRequest } from '@/hooks/admin/useAdminTransactionRequests';
import { UserRole } from '@/constants/roles';

const { Text } = Typography;

interface TransactionRequestTableProps {
  requests: AdminTransactionRequest[];
  page: number;
  pageSize: number;
  total: number;
  isLoading: boolean;
  onPageChange: (page: number, pageSize?: number) => void;
  currentUser?: { role?: string; fullName?: string; full_name?: string };
  onApprove: (id: string) => void;
  isApproving: boolean;
  onOpenRejectModal: (id: string) => void;
}

export const TransactionRequestTable = ({
  requests,
  page,
  pageSize,
  total,
  isLoading,
  onPageChange,
  currentUser,
  onApprove,
  isApproving,
  onOpenRejectModal,
}: TransactionRequestTableProps) => {
  const formatVND = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  const columns = [
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (record: AdminTransactionRequest) => (
        <Space orientation="vertical" size={0}>
          <Text strong style={{ color: '#1e293b' }}>{record.userName}</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>STK: {record.accountNumber}</Text>
        </Space>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      align: 'center' as const,
      render: (type: string) => (
        <Tag color={type === 'deposit' ? 'blue' : 'volcano'} style={{ borderRadius: 12, padding: '0 12px' }}>
          {type === 'deposit' ? 'NẠP TIỀN' : 'RÚT TIỀN'}
        </Tag>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'center' as const,
      render: (amount: string, record: AdminTransactionRequest) => (
        <Text strong style={{ color: record.type === 'deposit' ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
          {record.type === 'deposit' ? '+' : '-'}{formatVND(amount)}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string, record: AdminTransactionRequest) => {
        let color = 'default';
        let text = status.toUpperCase();
        if (status === 'pending') { color = 'warning'; text = 'CHỜ DUYỆT'; }
        if (status === 'approved') { color = 'success'; text = 'ĐÃ DUYỆT'; }
        if (status === 'rejected') { color = 'error'; text = 'TỪ CHỐI'; }
        if (status === 'auto_approved') { color = 'cyan'; text = 'DUYỆT TỰ ĐỘNG'; }

        return (
          <Space direction="vertical" size={2} align="center">
            <Tag color={color} style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>
              {text}
            </Tag>
            {status === 'rejected' && record.rejectionReason && (
              <Text type="danger" style={{ fontSize: 11, maxWidth: 150 }} ellipsis={{ tooltip: record.rejectionReason }}>
                {record.rejectionReason}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Người tạo',
      key: 'createdBy',
      align: 'center' as const,
      render: (record: AdminTransactionRequest) => (
        <Space orientation="vertical" size={0}>
          <Text>{record.createdBy}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(record.createdAt).toLocaleString('vi-VN')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center' as const,
      render: (record: AdminTransactionRequest) => {
        const isPending = record.status === 'pending';
        const isOwnRequest = record.createdBy === currentUser?.full_name || record.createdBy === currentUser?.fullName;

        if (!isPending) {
          if (record.approvedBy) {
            return (
              <Space orientation="vertical" size={0}>
                <Text type="secondary" style={{ fontSize: 12 }}>Bởi: {record.approvedBy}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{new Date(record.approvedAt!).toLocaleString('vi-VN')}</Text>
              </Space>
            );
          }
          return <Text type="secondary">-</Text>;
        }

        // Teller can't approve/reject pending requests
        if (currentUser?.role === UserRole.TELLER) {
          return <Text type="secondary">-</Text>;
        }

        if (isOwnRequest) {
          return (
            <Tooltip title="Bạn không thể duyệt yêu cầu do chính mình tạo">
              <span style={{ cursor: 'not-allowed' }}>
                <Button disabled type="primary" size="small" style={{ marginRight: 8 }}>Duyệt</Button>
                <Button disabled danger size="small">Từ chối</Button>
              </span>
            </Tooltip>
          );
        }

        return (
          <Space>
            <Popconfirm
              title="Xác nhận duyệt giao dịch này?"
              description="Hành động này sẽ cộng/trừ tiền trực tiếp vào tài khoản."
              onConfirm={() => onApprove(record.id)}
              okText="Duyệt"
              cancelText="Hủy"
            >
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                loading={isApproving}
                style={{ background: '#10B981', borderColor: '#10B981' }}
              >
                Duyệt
              </Button>
            </Popconfirm>
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => onOpenRejectModal(record.id)}
            >
              Từ chối
            </Button>
          </Space>
        );
      },
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
        dataSource={requests}
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
