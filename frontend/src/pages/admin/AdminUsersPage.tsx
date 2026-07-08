import {
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Button,
  Input,
  ConfigProvider,
  Modal,
  Descriptions,
  Tooltip,
  Form,
  Select,
} from 'antd';
import {
  SearchOutlined,
  LockOutlined,
  UnlockOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useAdminUsers, type AdminUser } from '@/hooks/admin/useAdminUsers';
import { useCreateUser } from '@/hooks/admin/useCreateUser';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/roles';
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

  const currentUser = useAuthStore((s) => s.user);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form] = Form.useForm();
  const createUserMutation = useCreateUser();

  const handleCreateUser = (values: Record<string, unknown>) => {
    createUserMutation.mutate(
      {
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: currentUser?.role === UserRole.SUPERADMIN ? values.role : UserRole.CUSTOMER,
      },
      {
        onSuccess: () => {
          setIsCreateModalOpen(false);
          form.resetFields();
        },
      }
    );
  };

  const formatVND = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  const columns = [
    {
      title: 'Tên & Email',
      key: 'user',
      align: 'center' as const,
      render: (record: AdminUser) => (
        <Space orientation="vertical" size={0} align="center">
          <Text strong style={{ color: '#1e293b' }}>{record.fullName}</Text>
          <Text type="secondary" style={{ fontSize: 13, color: '#64748b' }}>{record.email}</Text>
        </Space>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      align: 'center' as const,
      render: (role: string) => (
        <Tag variant="filled" color={role !== UserRole.CUSTOMER ? 'purple' : 'default'} style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>
          {role.toUpperCase()}
        </Tag>
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
      render: (balance: string, record: AdminUser) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#1e293b' }}>
          {record.role === UserRole.CUSTOMER ? formatVND(balance) : '-'}
        </Text>
      ),
    },
    {
      title: 'Ngày tham gia',
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
      render: (record: AdminUser) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setSelectedUser(record)}
            style={{ color: '#3B82F6' }}
          >
            Chi tiết
          </Button>
          {currentUser?.role !== UserRole.SUPERADMIN ? (
            <Tooltip title="Chỉ Super Admin mới được thực hiện thao tác này">
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
              onClick={() => handleLockUser(record.id)}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              Khóa
            </Button>
          ) : (
            <Button
              type="text"
              style={{ color: '#10B981', display: 'inline-flex', alignItems: 'center' }}
              icon={<UnlockOutlined />}
              onClick={() => handleUnlockUser(record.id)}
            >
              Mở khóa
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Quản Lý Người Dùng</Title>
        <Space>
          <Input
            placeholder="Tìm kiếm người dùng bằng tên hoặc email..."
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            style={{ width: 300, borderRadius: 8, height: 40 }}
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
          />
          {currentUser?.role === UserRole.SUPERADMIN && (
            <Button type="primary" style={{ borderRadius: 8, height: 40 }} onClick={() => setIsCreateModalOpen(true)}>Tạo Admin (Teller/Manager)</Button>
          )}
          {currentUser?.role === UserRole.TELLER && (
            <Button type="primary" style={{ borderRadius: 8, height: 40 }} onClick={() => setIsCreateModalOpen(true)}>Tạo Customer</Button>
          )}
          <Button style={{ borderRadius: 8, height: 40 }}>Xuất CSV</Button>
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
        title={<span style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Chi Tiết Hồ Sơ Người Dùng</span>}
        footer={null}
        width={600}
        styles={{ body: { paddingTop: 16 } }}
      >
        {selectedUser && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Mã người dùng"><Text copyable>{selectedUser.id}</Text></Descriptions.Item>
            <Descriptions.Item label="Họ và tên">{selectedUser.fullName}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
            <Descriptions.Item label="Vai trò">
              <Tag color={selectedUser.role !== UserRole.CUSTOMER ? 'purple' : 'blue'}>
                {selectedUser.role.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái tài khoản">
              <Tag color={selectedUser.status === 'active' ? 'success' : 'error'}>
                {selectedUser.status.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Số dư hiện tại">
              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                {selectedUser.role === UserRole.CUSTOMER ? formatVND(selectedUser.balance) : '-'}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {new Date(selectedUser.createdAt).toLocaleString('vi-VN')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
        }}
        title={<span style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Thêm Người Dùng Mới</span>}
        okText="Tạo mới"
        cancelText="Hủy"
        onOk={() => form.submit()}
        confirmLoading={createUserMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateUser} style={{ marginTop: 16 }}>
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
          >
            <Input placeholder="Nhập họ và tên" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="Nhập email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu (Mật khẩu phải có ít nhất 6 ký tự)" />
          </Form.Item>
          {currentUser?.role === UserRole.SUPERADMIN && (
            <Form.Item
              name="role"
              label="Vai trò"
              rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
            >
              <Select placeholder="Chọn vai trò">
                <Select.Option value={UserRole.TELLER}>Giao dịch viên (Teller)</Select.Option>
                <Select.Option value={UserRole.MANAGER}>Quản lý (Manager)</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
