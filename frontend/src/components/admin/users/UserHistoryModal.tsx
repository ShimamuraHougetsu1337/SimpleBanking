import { Modal, Table, Typography, Tag, Space } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import type { UserHistoryRecord } from '@/types/admin';

const { Text } = Typography;

interface UserHistoryModalProps {
  open: boolean;
  userId: string | null;
  onClose: () => void;
}

export function UserHistoryModal({ open, userId, onClose }: UserHistoryModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user-history', userId],
    queryFn: () => adminService.getUserHistory(userId!),
    enabled: !!userId && open,
  });

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Space orientation="vertical" size={0}>
          <Text style={{ fontVariantNumeric: 'tabular-nums' }}>
            {new Date(date).toLocaleDateString('vi-VN')}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(date).toLocaleTimeString('vi-VN')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Trường thay đổi',
      dataIndex: 'changedField',
      key: 'changedField',
      render: (field: string) => <Tag color="blue">{field}</Tag>,
    },
    {
      title: 'Giá trị cũ',
      dataIndex: 'oldValue',
      key: 'oldValue',
      render: (val: string | null) => val ? <Text delete>{val}</Text> : <Text type="secondary">N/A</Text>,
    },
    {
      title: 'Giá trị mới',
      dataIndex: 'newValue',
      key: 'newValue',
      render: (val: string | null) => val ? <Text strong type="success">{val}</Text> : <Text type="secondary">N/A</Text>,
    },
  ];

  return (
    <Modal
      title="Lịch sử thay đổi thông tin người dùng"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Table<UserHistoryRecord>
        rowKey="id"
        columns={columns}
        dataSource={data || []}
        loading={isLoading}
        pagination={{ pageSize: 5 }}
        size="small"
      />
    </Modal>
  );
}
