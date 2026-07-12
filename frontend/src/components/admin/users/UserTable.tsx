import { Table, Typography, Tag, Space, Button, Tooltip, Modal, ConfigProvider } from 'antd';
import {
  LockOutlined,
  UnlockOutlined,
  EyeOutlined,
  HistoryOutlined,
  DeleteOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import type { AdminUser } from '@/services/admin.service';
import { UserRole } from '@/constants/roles';

const { Text } = Typography;

interface UserTableProps {
  users: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
  isLoading: boolean;
  currentUser?: { role?: string };
  onPageChange: (page: number, pageSize?: number) => void;
  onLockUser: (id: string) => void;
  onUnlockUser: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onReactivateOtp: (id: string) => void;
  onSelectUser: (user: AdminUser) => void;
  onSelectHistoryUser: (id: string) => void;
}

export const UserTable = ({
  users,
  page,
  pageSize,
  total,
  isLoading,
  currentUser,
  onPageChange,
  onLockUser,
  onUnlockUser,
  onDeleteUser,
  onReactivateOtp,
  onSelectUser,
  onSelectHistoryUser,
}: UserTableProps) => {
  const formatVND = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  const columns = [
    {
      title: 'Tên & Email',
      key: 'user',
      align: 'center' as const,
      render: (record: AdminUser) => (
        <Space direction="vertical" size={0} align="center">
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
      key: 'status',
      align: 'center' as const,
      render: (record: AdminUser) => (
        <Space size={4} wrap>
          <Tag variant="filled" color={record.status === 'active' ? 'success' : 'error'} style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>
            {record.status.toUpperCase()}
          </Tag>
          {record.isOtpBlocked && (
            <Tag color="warning" style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>
              OTP BỊ KHÓA
            </Tag>
          )}
        </Space>
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
      title: 'Ngày cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      align: 'center' as const,
      render: (date: string) => {
        if (!date) return '-';
        const d = new Date(date);
        return (
          <Text style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#64748b' }}>
            {d.toLocaleDateString('vi-VN')} {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        );
      },
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
            onClick={() => onSelectUser(record)}
            style={{ color: '#3B82F6' }}
            title="Chi tiết"
          />
          <Button
            type="text"
            icon={<HistoryOutlined />}
            onClick={() => onSelectHistoryUser(record.id)}
            style={{ color: '#8B5CF6' }}
            title="Lịch sử"
          />
          {(() => {
            const cannotChangeStatus = 
              currentUser?.role !== UserRole.SUPERADMIN &&
              (currentUser?.role !== UserRole.MANAGER || record.role !== UserRole.CUSTOMER);

            if (cannotChangeStatus) {
              return (
                <Tooltip title="Bạn không có quyền thay đổi trạng thái của tài khoản này">
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
              );
            }

            if (record.status === 'active') {
              return (
                <Button
                  danger
                  type="text"
                  icon={<LockOutlined />}
                  onClick={() => onLockUser(record.id)}
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  Khóa
                </Button>
              );
            }

            return (
              <Button
                type="text"
                style={{ color: '#10B981', display: 'inline-flex', alignItems: 'center' }}
                icon={<UnlockOutlined />}
                onClick={() => onUnlockUser(record.id)}
              >
                Mở khóa
              </Button>
            );
          })()}
          {record.isOtpBlocked && (currentUser?.role === UserRole.SUPERADMIN || currentUser?.role === UserRole.MANAGER) && record.role === UserRole.CUSTOMER && (
            <Button
              type="text"
              style={{ color: '#D97706', display: 'inline-flex', alignItems: 'center' }}
              icon={<KeyOutlined />}
              onClick={() => Modal.confirm({
                title: 'Mở khóa OTP cho khách hàng?',
                content: `Xác nhận kích hoạt lại OTP cho khách hàng ${record.fullName}?`,
                okText: 'Kích hoạt',
                okType: 'primary',
                cancelText: 'Hủy',
                onOk: () => onReactivateOtp(record.id)
              })}
              title="Kích hoạt lại OTP"
            >
              Mở OTP
            </Button>
          )}
          {currentUser?.role === UserRole.SUPERADMIN && (
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => Modal.confirm({
                title: 'Xác nhận xóa người dùng?',
                content: 'Hành động này sẽ vô hiệu hóa hoàn toàn người dùng (Xóa mềm). Bạn có chắc chắn không?',
                okText: 'Xóa',
                okType: 'danger',
                cancelText: 'Hủy',
                onOk: () => onDeleteUser(record.id)
              })}
              style={{ display: 'inline-flex', alignItems: 'center' }}
              title="Xóa mềm"
            />
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
        dataSource={users}
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
