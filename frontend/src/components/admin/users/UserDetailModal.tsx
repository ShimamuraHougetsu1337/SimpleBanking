import { Modal, Descriptions, Tag, Typography } from 'antd';
import type { AdminUser } from '@/services/admin.service';
import { UserRole } from '@/constants/roles';

const { Text } = Typography;

interface UserDetailModalProps {
  user: AdminUser | null;
  onClose: () => void;
  formatVND: (amount: string) => string;
}

export const UserDetailModal = ({ user, onClose, formatVND }: UserDetailModalProps) => {
  return (
    <Modal
      open={!!user}
      onCancel={onClose}
      title={<span style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Chi Tiết Hồ Sơ Người Dùng</span>}
      footer={null}
      width={600}
      styles={{ body: { paddingTop: 16 } }}
    >
      {user && (
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Mã người dùng"><Text copyable>{user.id}</Text></Descriptions.Item>
          <Descriptions.Item label="Họ và tên">{user.fullName}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Vai trò">
            <Tag color={user.role !== UserRole.CUSTOMER ? 'purple' : 'blue'}>
              {user.role.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái tài khoản">
            <Tag color={user.status === 'active' ? 'success' : 'error'}>
              {user.status.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Số dư hiện tại">
            <span style={{ fontWeight: 600, color: '#1e293b' }}>
              {user.role === UserRole.CUSTOMER ? formatVND(user.balance) : '-'}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            {new Date(user.createdAt).toLocaleString('vi-VN')}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  );
};
