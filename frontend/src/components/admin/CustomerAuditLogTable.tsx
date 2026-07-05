import { Table, Tag, Typography, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CustomerAuditLog } from '@/services/admin.service';
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
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
      width: 170,
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <div>
          <Text strong>{record.customerName || 'Unknown'}</Text>
          {record.customerEmail && <div style={{ fontSize: '12px', color: '#64748b' }}>{record.customerEmail}</div>}
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => (
        <Tag color={actionColors[action] || 'default'}>{action}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'success' ? 'success' : 'error'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Transaction ID',
      dataIndex: 'transactionId',
      key: 'transactionId',
      render: (txId) => txId ? (
        <Tooltip title={txId}>
          <Text style={{ fontFamily: 'monospace' }}>{txId.split('-')[0]}...</Text>
        </Tooltip>
      ) : '-',
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
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
