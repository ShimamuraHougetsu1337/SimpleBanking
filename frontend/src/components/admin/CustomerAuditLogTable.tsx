import { Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CustomerAuditLog } from '@/types/admin';
import dayjs from 'dayjs';
import AuditMetadataViewer from './AuditMetadataViewer';

const { Text } = Typography;

interface Props {
  logs: CustomerAuditLog[];
  loading: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

const actionColors: Record<string, string> = {
  TRANSFER: 'blue',
  DEPOSIT: 'green',
  WITHDRAW: 'orange',
  CUSTOMER_LOGIN: 'gold',
  UPDATE_PROFILE: 'cyan',
  CHANGE_PASSWORD: 'purple',
};

export default function CustomerAuditLogTable({ logs, loading, pagination }: Props) {
  const columns: ColumnsType<CustomerAuditLog> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
      width: 170,
      align: 'center',
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      align: 'center',
      render: (_, record) => (
        <div>
          <Text strong>{record.customerName || 'Không rõ'}</Text>
          {record.customerEmail && <div style={{ fontSize: '12px', color: '#64748b' }}>{record.customerEmail}</div>}
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
          <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {record.transactionId && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ color: '#475569', fontSize: 13 }}>Mã giao dịch (Transaction ID):</Text>
                <Text copyable style={{ fontFamily: 'monospace', color: '#0f172a', fontSize: 13 }}>
                  {record.transactionId}
                </Text>
              </div>
            )}
            <AuditMetadataViewer metadata={record.metadata} />
          </div>
        ),
        rowExpandable: (record) => !!record.metadata || !!record.transactionId,
      }}
    />
  );
}
