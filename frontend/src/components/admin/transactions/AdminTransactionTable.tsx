import { Table, Typography, Tag, Space, ConfigProvider } from 'antd';
import { formatVnd } from '@/utils/format';
import type { AdminTransaction } from '@/services/admin.service';

const { Text } = Typography;

export const ADMIN_TRANSACTION_COLUMNS = [
  {
    title: 'Tx ID',
    dataIndex: 'id',
    key: 'id',
    align: 'center' as const,
    render: (id: string) => <Text type="secondary" copyable>{id}</Text>,
  },
  {
    title: 'Date & Time',
    dataIndex: 'createdAt',
    key: 'createdAt',
    align: 'center' as const,
    render: (date: string) => (
      <Space direction="vertical" size={0} align="center">
        <Text style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#1e293b' }}>
          {new Date(date).toLocaleDateString('vi-VN')}
        </Text>
        <Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#64748b' }}>
          {new Date(date).toLocaleTimeString('vi-VN')}
        </Text>
      </Space>
    ),
  },
  {
    title: 'Sender',
    dataIndex: 'fromUserName',
    key: 'sender_name',
    align: 'center' as const,
    render: (name: string, record: AdminTransaction) => (
      <Space direction="vertical" size={0} align="center">
        <Text strong style={{ color: '#1e293b' }}>{name || '-'}</Text>
        {record.fromAccount && (
          <Text type="secondary" style={{ fontSize: 12, color: '#64748b' }} copyable>
            {record.fromAccount}
          </Text>
        )}
      </Space>
    ),
  },
  {
    title: 'Receiver',
    dataIndex: 'toUserName',
    key: 'receiver_name',
    align: 'center' as const,
    render: (name: string, record: AdminTransaction) => (
      <Space direction="vertical" size={0} align="center">
        <Text strong style={{ color: '#1e293b' }}>{name || '-'}</Text>
        {record.toAccount && (
          <Text type="secondary" style={{ fontSize: 12, color: '#64748b' }} copyable>
            {record.toAccount}
          </Text>
        )}
      </Space>
    ),
  },
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    align: 'center' as const,
    render: (type: string) => (
      <Tag bordered={false} color={type === 'deposit' ? 'blue' : 'default'} style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>
        {type.toUpperCase()}
      </Tag>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    align: 'center' as const,
    render: (status: string) => {
      let color = 'default';
      if (status === 'completed') color = 'success';
      if (status === 'failed') color = 'error';
      if (status === 'pending') color = 'warning';
      return <Tag bordered={false} color={color} style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>{status.toUpperCase()}</Tag>;
    },
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    key: 'amount',
    align: 'center' as const,
    render: (amount: string) => (
      <Text strong style={{ fontSize: '15px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#1e293b' }}>
        {formatVnd(amount)}
      </Text>
    ),
  },
  {
    title: 'Fee',
    dataIndex: 'fee',
    key: 'fee',
    align: 'center' as const,
    render: (fee: string, record: AdminTransaction) => {
      const feeNum = Number(fee || 0);
      if (feeNum === 0 || record.type !== 'transfer') return <Text type="secondary">-</Text>;
      return (
        <Text type="secondary" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {formatVnd(fee)}
        </Text>
      );
    },
  },
  {
    title: 'Total',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    align: 'center' as const,
    render: (totalAmount: string, record: AdminTransaction) => {
      const val = totalAmount || record.amount;
      return (
        <Text strong style={{ fontSize: '15px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#dc2626' }}>
          {formatVnd(val)}
        </Text>
      );
    },
  },
];

interface AdminTransactionTableProps {
  transactions: AdminTransaction[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
}

export const AdminTransactionTable = ({
  transactions,
  page,
  pageSize,
  total,
  onPageChange,
}: AdminTransactionTableProps) => (
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
      columns={ADMIN_TRANSACTION_COLUMNS}
      dataSource={transactions}
      rowKey="id"
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
