import { Card, Table, Typography, Tag, Space, Button, Select, ConfigProvider, Tooltip, Popconfirm } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAdminTransactionRequests, type AdminTransactionRequest } from '@/hooks/admin/useAdminTransactionRequests';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/roles';

const { Title, Text } = Typography;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
};

const formatVND = (amount: string) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
};

export default function AdminTransactionRequestsPage() {
  const {
    requests,
    total,
    page,
    pageSize,
    statusFilter,
    handlePageChange,
    handleStatusFilterChange,
    isLoading,
    approveRequest,
    isApproving,
    rejectRequest,
    isRejecting,
  } = useAdminTransactionRequests();

  const currentUser = useAuthStore((s) => s.user);

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
      align: 'right' as const,
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
      render: (status: string) => {
        let color = 'default';
        let text = status.toUpperCase();
        if (status === 'pending') { color = 'warning'; text = 'CHỜ DUYỆT'; }
        if (status === 'approved') { color = 'success'; text = 'ĐÃ DUYỆT'; }
        if (status === 'rejected') { color = 'error'; text = 'TỪ CHỐI'; }
        if (status === 'auto_approved') { color = 'cyan'; text = 'DUYỆT TỰ ĐỘNG'; }
        
        return (
          <Tag color={color} style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>
            {text}
          </Tag>
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
        
        // Teller can't approve/reject
        if (currentUser?.role === UserRole.TELLER) {
          return <Text type="secondary">-</Text>;
        }

        if (!isPending) {
          if (record.approvedBy) {
             return (
               <Space orientation="vertical" size={0}>
                 <Text type="secondary" style={{ fontSize: 12 }}>Bởi: {record.approvedBy}</Text>
                 <Text type="secondary" style={{ fontSize: 12 }}>{new Date(record.approvedAt!).toLocaleString('vi-VN')}</Text>
               </Space>
             )
          }
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
              onConfirm={() => approveRequest(record.id)}
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
            <Popconfirm
              title="Từ chối giao dịch này?"
              onConfirm={() => rejectRequest(record.id)}
              okText="Từ chối"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                loading={isRejecting}
              >
                Từ chối
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Yêu Cầu Giao Dịch</Title>
          <Text type="secondary">Quản lý duyệt giao dịch Nạp/Rút hạn mức lớn (Maker-Checker)</Text>
        </div>
        <Space>
          <Select
            placeholder="Lọc theo trạng thái"
            style={{ width: 180, height: 40 }}
            allowClear
            value={statusFilter}
            onChange={handleStatusFilterChange}
            options={[
              { value: 'pending', label: 'Đang chờ duyệt' },
              { value: 'approved', label: 'Đã duyệt' },
              { value: 'rejected', label: 'Đã từ chối' },
              { value: 'auto_approved', label: 'Duyệt tự động' },
            ]}
          />
        </Space>
      </div>

      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
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
              onChange: handlePageChange,
            }}
          />
        </ConfigProvider>
      </Card>
    </div>
  );
}
