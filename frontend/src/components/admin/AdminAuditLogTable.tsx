import { Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AdminAuditLog } from '@/types/admin';
import dayjs from 'dayjs';
import AuditMetadataViewer from './AuditMetadataViewer';

const { Text } = Typography;

interface Props {
  logs: AdminAuditLog[];
  loading: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

const actionColors: Record<string, string> = {
  UPDATE_USER_STATUS: 'blue',
  UPDATE_ACCOUNT_STATUS: 'cyan',
  ADMIN_DEPOSIT: 'green',
  UPDATE_SETTINGS: 'purple',
  ADMIN_LOGIN: 'gold',
};

export default function AdminAuditLogTable({ logs, loading, pagination }: Props) {
  const columns: ColumnsType<AdminAuditLog> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
      width: 170,
      align: 'center',
    },
    {
      title: 'Quản trị viên',
      key: 'admin',
      align: 'center',
      render: (_, record) => (
        <div>
          <Text strong>{record.adminName || 'Hệ thống'}</Text>
          {record.adminEmail && <div style={{ fontSize: '12px', color: '#64748b' }}>{record.adminEmail}</div>}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      dataIndex: 'action',
      key: 'action',
      align: 'center',
      render: (action: string) => (
        <Tag color={actionColors[action] || 'default'}>{action}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status: string) => (
        <Tag color={status === 'success' ? 'success' : 'error'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      align: 'center',
      render: (ip) => ip || '-',
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={logs}
      rowKey="id"
      loading={loading}
      pagination={{
        ...pagination,
        showSizeChanger: true,
      }}
      scroll={{ x: 'max-content' }}
      expandable={{
        expandedRowRender: (record) => (
          <div style={{ padding: '8px 16px' }}>
            <AuditMetadataViewer metadata={record.metadata} />
          </div>
        ),
        rowExpandable: (record) => !!record.metadata,
      }}
    />
  );
}
