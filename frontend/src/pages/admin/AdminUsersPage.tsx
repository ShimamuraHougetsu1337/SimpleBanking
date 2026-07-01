import {
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Button,
  Input,
  Row,
  Col,
  Statistic,
  ConfigProvider,
  Modal,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  LockOutlined,
  UnlockOutlined,
  UsergroupAddOutlined,
  UserDeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useAdminUsers, type AdminUser } from '@/hooks/admin/useAdminUsers';
import { useState } from 'react';
import type { ChangeEvent } from 'react';

const { Title, Text } = Typography;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
};

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
    isLoading,
  } = useAdminUsers();

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

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
          <Text strong style={{ color: '#1e293b' }}>{record.fullName}</Text>
          <Text type="secondary" style={{ fontSize: 13, color: '#64748b' }}>{record.email}</Text>
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
        <Text strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#1e293b' }}>
          {record.role !== 'admin' ? formatVND(balance) : '-'}
        </Text>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      align: 'right' as const,
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
      render: (record: AdminUser) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setSelectedUser(record)}
            style={{ color: '#3B82F6', marginRight: 8 }}
          >
            Details
          </Button>
          {record.role !== 'admin' ? (
            record.status === 'active' ? (
              <Button
                danger
                type="text"
                icon={<LockOutlined />}
                onClick={() => handleLockUser(record.id)}
                style={{ width: 90, textAlign: 'left', display: 'inline-flex', alignItems: 'center' }}
              >
                Lock
              </Button>
            ) : (
              <Button
                type="text"
                style={{ color: '#10B981', width: 90, textAlign: 'left', display: 'inline-flex', alignItems: 'center' }}
                icon={<UnlockOutlined />}
                onClick={() => handleUnlockUser(record.id)}
              >
                Unlock
              </Button>
            )
          ) : (
            <div style={{ width: 90 }} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>User Management</Title>
        <Space>
          <Input
            placeholder="Search users by name or email..."
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            style={{ width: 300, borderRadius: 8, height: 40 }}
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
          />
          <Button type="primary" style={{ borderRadius: 8, height: 40 }}>Export CSV</Button>
        </Space>
      </div>

      <Card style={CARD_SHADOW_STYLE} bodyStyle={{ padding: 0, overflow: 'hidden' }}>
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

      <Modal
        open={!!selectedUser}
        onCancel={() => setSelectedUser(null)}
        title={<span style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>User Profile Details</span>}
        footer={null}
        width={600}
        bodyStyle={{ paddingTop: 16 }}
      >
        {selectedUser && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="User ID"><Text copyable>{selectedUser.id}</Text></Descriptions.Item>
            <Descriptions.Item label="Full Name">{selectedUser.fullName}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
            <Descriptions.Item label="Role">
              <Tag color={selectedUser.role === 'admin' ? 'purple' : 'blue'}>
                {selectedUser.role.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Account Status">
              <Tag color={selectedUser.status === 'active' ? 'success' : 'error'}>
                {selectedUser.status.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Current Balance">
              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                {selectedUser.role !== 'admin' ? formatVND(selectedUser.balance) : '-'}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {new Date(selectedUser.createdAt).toLocaleString('vi-VN')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
