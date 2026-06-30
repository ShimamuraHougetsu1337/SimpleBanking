import { Card, Table, Typography, Tag, Space, Button, Input, DatePicker, Row, Col, Statistic, ConfigProvider } from 'antd';
import { SearchOutlined, FilterOutlined, SwapOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Mock Data
const mockTransactions = [
  {
    id: 'tx-1001',
    created_at: '2026-06-29T10:30:00Z',
    sender_name: 'System',
    receiver_name: 'John Doe',
    amount: '1500000',
    status: 'completed',
    type: 'deposit',
  },
  {
    id: 'tx-1002',
    created_at: '2026-06-28T15:45:00Z',
    sender_name: 'John Doe',
    receiver_name: 'Starbucks (Merchant)',
    amount: '350000',
    status: 'completed',
    type: 'transfer',
  },
  {
    id: 'tx-1003',
    created_at: '2026-06-27T09:15:00Z',
    sender_name: 'Jane Smith',
    receiver_name: 'John Doe',
    amount: '500000',
    status: 'failed',
    type: 'transfer',
  },
  {
    id: 'tx-1004',
    created_at: '2026-06-26T11:20:00Z',
    sender_name: 'John Doe',
    receiver_name: 'Jane Smith',
    amount: '2000000',
    status: 'completed',
    type: 'transfer',
  },
];

export default function AdminTransactionsPage() {
  const formatVND = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  const columns = [
    {
      title: 'Tx ID',
      dataIndex: 'id',
      key: 'id',
      // Left-align text
      render: (id: string) => <Text type="secondary" copyable>{id}</Text>,
    },
    {
      title: 'Date & Time',
      dataIndex: 'created_at',
      key: 'created_at',
      align: 'right' as const, // Right-align dates
      render: (date: string) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{new Date(date).toLocaleDateString('vi-VN')}</Text>
          <Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{new Date(date).toLocaleTimeString('vi-VN')}</Text>
        </Space>
      ),
    },
    {
      title: 'Sender',
      dataIndex: 'sender_name',
      key: 'sender_name',
      // Left-align text
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Receiver',
      dataIndex: 'receiver_name',
      key: 'receiver_name',
      // Left-align text
      render: (name: string) => <Text strong>{name}</Text>,
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
      align: 'right' as const, // Right-align numeric values
      render: (amount: string) => (
        <Text strong style={{ fontSize: '15px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {formatVND(amount)}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>All Transactions</Title>
        <Space>
          <Button icon={<FilterOutlined />}>Filters</Button>
          <Button type="primary" style={{ borderRadius: 8 }}>Export Report</Button>
        </Space>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false}>
            <Statistic title="Total Volume (24h)" value={14250000} formatter={(val) => formatVND(val.toString())} prefix={<SwapOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false}>
            <Statistic title="Successful Txs (24h)" value={1204} valueStyle={{ color: '#10B981' }} prefix={<ArrowUpOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false}>
            <Statistic title="Failed Txs (24h)" value={12} valueStyle={{ color: '#EF4444' }} prefix={<ArrowDownOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} bodyStyle={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '24px 24px 16px', display: 'flex', gap: 16 }}>
          <Input
            placeholder="Search by Tx ID, Sender, or Receiver..."
            prefix={<SearchOutlined />}
            style={{ width: 350, borderRadius: 8 }}
          />
          <RangePicker style={{ borderRadius: 8 }} />
        </div>
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
            dataSource={mockTransactions}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        </ConfigProvider>
      </Card>
    </div>
  );
}
