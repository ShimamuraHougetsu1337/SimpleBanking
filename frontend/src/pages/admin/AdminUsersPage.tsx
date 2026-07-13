import { Card, Typography, Space, Button, Input, Switch, Tabs } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAdminUsers, type AdminUser } from '@/hooks/admin/useAdminUsers';
import { useCreateUser } from '@/hooks/admin/useCreateUser';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/roles';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { UserHistoryModal } from '@/components/admin/users/UserHistoryModal';
import { UserTable } from '@/components/admin/users/UserTable';
import { UserDetailModal } from '@/components/admin/users/UserDetailModal';
import { UserCreateModal } from '@/components/admin/users/UserCreateModal';

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
    handleDeleteUser,
    handleReactivateOtp,
    includeDeleted,
    setIncludeDeleted,
    roleGroup,
    handleRoleGroupChange,
    isLoading,
  } = useAdminUsers();

  const currentUser = useAuthStore((s) => s.user);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const createUserMutation = useCreateUser();

  const handleCreateUser = (values: Record<string, unknown>) => {
    createUserMutation.mutate(
      {
        fullName: values.fullName as string,
        email: values.email as string,
        password: values.password as string,
        role: currentUser?.role === UserRole.SUPERADMIN ? (values.role as string) : UserRole.CUSTOMER,
      },
      {
        onSuccess: () => {
          setIsCreateModalOpen(false);
        },
      }
    );
  };

  const formatVND = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Quản Lý Người Dùng</Title>
        <Space>
          <Input
            placeholder="Tìm kiếm bằng tên, email, SĐT..."
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            style={{ width: 350, borderRadius: 8, height: 40 }}
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
          />
        </Space>
      </div>

      <Tabs
        activeKey={roleGroup}
        onChange={(key) => handleRoleGroupChange(key as 'customer' | 'staff')}
        items={[
          { key: 'customer', label: 'Tài khoản khách hàng' },
          { key: 'staff', label: 'Nhân viên & Quản trị' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space size={16}>
          {currentUser?.role === UserRole.SUPERADMIN && (
            <Space>
              <Switch
                checked={includeDeleted}
                onChange={(checked) => setIncludeDeleted(checked)}
              />
              <Text type="secondary">Hiển thị tài khoản đã xóa</Text>
            </Space>
          )}
        </Space>
        <Space>
          {currentUser?.role === UserRole.SUPERADMIN && (
            <Button
              type="primary"
              onClick={() => setIsCreateModalOpen(true)}
              style={{ borderRadius: 8, height: 40, background: '#3B82F6' }}
            >
              Thêm người dùng mới
            </Button>
          )}
        </Space>
      </div>

      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        <UserTable
          users={users}
          page={page}
          pageSize={pageSize}
          total={total}
          isLoading={isLoading}
          currentUser={currentUser || undefined}
          onPageChange={handlePageChange}
          onLockUser={handleLockUser}
          onUnlockUser={handleUnlockUser}
          onDeleteUser={handleDeleteUser}
          onReactivateOtp={handleReactivateOtp}
          onSelectUser={setSelectedUser}
          onSelectHistoryUser={setHistoryUserId}
        />
      </Card>

      <UserHistoryModal 
        open={!!historyUserId} 
        userId={historyUserId || ''} 
        onClose={() => setHistoryUserId(null)} 
      />

      <UserDetailModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        formatVND={formatVND}
      />

      <UserCreateModal
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onFinish={handleCreateUser}
        isPending={createUserMutation.isPending}
        currentUserRole={currentUser?.role}
      />
    </div>
  );
}
