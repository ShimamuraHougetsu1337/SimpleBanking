import { Card, Table, Typography, Tag, Space, Button, Input, Row, Col, Statistic, ConfigProvider } from 'antd';
import { SearchOutlined, LockOutlined, UnlockOutlined, UsergroupAddOutlined, UserDeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// Mock Data
const mockUsers = [
  {
    id: 'u-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'customer',
    status: 'active',
    balance: '24500000',
    created_at: '2026-01-15T10:30:00Z',
  },
  {
    id: 'u-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'customer',
    status: 'active',
    balance: '1500000',
    created_at: '2026-03-22T14:15:00Z',
  },
  {
    id: 'u-3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: 'customer',
    status: 'locked',
    balance: '500000',
    created_at: '2026-05-10T09:45:00Z',
  },
  {
    id: 'u-4',
    name: 'Admin System',
    email: 'admin@simplebank.com',
    role: 'admin',
    status: 'active',
    balance: '0',
    created_at: '2025-12-01T08:00:00Z',
  },
];

export default function AdminUsersPage() {
  const formatVND = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  const columns = [
    {
      title: 'Name & Email',
      key: 'user',
      // Left-align textual content
      render: (record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>{record.email}</Text>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      align: 'center' as const,
      render: (role: string) => (
        <Tag bordered={false} color={role === 'admin' ? 'purple' : 'default'} style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>
          {role.toUpperCase()}
        </Tag>
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
      align: 'right' as const, // Right-align numeric/monetary values
      render: (balance: string, record: any) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {record.role !== 'admin' ? formatVND(balance) : '-'}
        </Text>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'created_at',
      key: 'created_at',
      align: 'right' as const, // Right-align dates
      render: (date: string) => <Text style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#64748b' }}>{new Date(date).toLocaleDateString('vi-VN')}</Text>,
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const, // Right-align action buttons
      render: (record: any) => {
        if (record.role === 'admin') return <Text type="secondary" disabled>No actions</Text>;

        return record.status === 'active' ? (
          <Button danger type="text" icon={<LockOutlined />}>Lock</Button>
        ) : (
          <Button type="text" style={{ color: '#10B981' }} icon={<UnlockOutlined />}>Unlock</Button>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>User Management</Title>
        <Space>
          <Input
            placeholder="Search users by name or email..."
            prefix={<SearchOutlined />}
            style={{ width: 300, borderRadius: 8 }}
          />
          <Button type="primary" style={{ borderRadius: 8 }}>Export CSV</Button>
        </Space>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card variant="borderless">
            <Statistic title="Total Users" value={1254} prefix={<UsergroupAddOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless">
            <Statistic title="Active Accounts" value={1180} valueStyle={{ color: '#10B981' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless">
            <Statistic title="Locked Accounts" value={74} valueStyle={{ color: '#EF4444' }} prefix={<UserDeleteOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card variant="borderless" bodyStyle={{ padding: 0, overflow: 'hidden' }}>
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
            dataSource={mockUsers}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </ConfigProvider>
      </Card>
    </div>
  );
}
