import { Card, Table, Typography, Tag, Space, Button, Input, Row, Col, Statistic, ConfigProvider } from 'antd';
import { SearchOutlined, LockOutlined, UnlockOutlined, UsergroupAddOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { useAdminUsers, type AdminUser } from '@/hooks/admin/useAdminUsers';

const { Title, Text } = Typography;

export default function AdminUsersPage() {
  const {
    users,
    total,
    page,
    pageSize,
    searchQuery,
    handleSearchChange,
    handlePageChange,
    handleLockUser,
    handleUnlockUser,
    stats,
  } = useAdminUsers();

  const formatVND = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  const columns = [
    {
      title: 'Name & Email',
      key: 'user',
      align: 'left' as const,
      render: (record: AdminUser) => (
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
      align: 'right' as const,
      render: (balance: string, record: AdminUser) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {record.role !== 'admin' ? formatVND(balance) : '-'}
        </Text>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'created_at',
      key: 'created_at',
      align: 'right' as const,
      render: (date: string) => <Text style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#64748b' }}>{new Date(date).toLocaleDateString('vi-VN')}</Text>,
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: (record: AdminUser) => {
        if (record.role === 'admin') return <Text type="secondary" disabled>No actions</Text>;

        return record.status === 'active' ? (
          <Button
            danger
            type="text"
            icon={<LockOutlined />}
            onClick={() => handleLockUser(record.id)}
          >
            Lock
          </Button>
        ) : (
          <Button
            type="text"
            style={{ color: '#10B981' }}
            icon={<UnlockOutlined />}
            onClick={() => handleUnlockUser(record.id)}
          >
            Unlock
          </Button>
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
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <Button type="primary" style={{ borderRadius: 8 }}>Export CSV</Button>
        </Space>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card variant="borderless">
            <Statistic title="Total Users" value={stats.totalUsers} prefix={<UsergroupAddOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless">
            <Statistic title="Active Accounts" value={stats.activeAccounts} valueStyle={{ color: '#10B981' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless">
            <Statistic title="Locked Accounts" value={stats.lockedAccounts} valueStyle={{ color: '#EF4444' }} prefix={<UserDeleteOutlined />} />
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
            dataSource={users}
            rowKey="id"
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
