import {
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Button,
  Input,
  DatePicker,
  Select,
  Row,
  Col,
  Statistic,
  ConfigProvider,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  SwapOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useAdminTransactions } from '@/hooks/admin/useAdminTransactions';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
};

export default function AdminTransactionsPage() {
  const {
    transactions,
    total,
    page,
    pageSize,
    searchQuery,
    typeFilter,
    handleSearchChange,
    handleTypeFilterChange,
    handleDateRangeChange,
    handlePageChange,
    stats,
  } = useAdminTransactions();

  const formatVND = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  const columns = [
    {
      title: 'Tx ID',
      dataIndex: 'id',
      key: 'id',
      align: 'left' as const,
      render: (id: string) => <Text type="secondary" copyable>{id}</Text>,
    },
    {
      title: 'Date & Time',
      dataIndex: 'created_at',
      key: 'created_at',
      align: 'right' as const,
      render: (date: string) => (
        <Space direction="vertical" size={0}>
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
      dataIndex: 'sender_name',
      key: 'sender_name',
      align: 'left' as const,
      render: (name: string) => <Text strong style={{ color: '#1e293b' }}>{name}</Text>,
    },
    {
      title: 'Receiver',
      dataIndex: 'receiver_name',
      key: 'receiver_name',
      align: 'left' as const,
      render: (name: string) => <Text strong style={{ color: '#1e293b' }}>{name}</Text>,
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
      align: 'right' as const,
      render: (amount: string) => (
        <Text strong style={{ fontSize: '15px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#1e293b' }}>
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
          <Button icon={<FilterOutlined />}>More Filters</Button>
          <Button type="primary" style={{ borderRadius: 8, height: 40 }}>Export Report</Button>
        </Space>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={CARD_SHADOW_STYLE} bodyStyle={{ padding: '24px' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Total Volume</span>}
              value={stats.totalVolume}
              formatter={(val) => formatVND(val.toString())}
              prefix={<SwapOutlined style={{ color: '#3B82F6' }} />}
              valueStyle={{ color: '#1e293b', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={CARD_SHADOW_STYLE} bodyStyle={{ padding: '24px' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Successful Txs</span>}
              value={stats.successfulCount}
              valueStyle={{ color: '#10B981', fontWeight: 700 }}
              prefix={<ArrowUpOutlined style={{ color: '#10B981' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={CARD_SHADOW_STYLE} bodyStyle={{ padding: '24px' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Failed Txs</span>}
              value={stats.failedCount}
              valueStyle={{ color: '#EF4444', fontWeight: 700 }}
              prefix={<ArrowDownOutlined style={{ color: '#EF4444' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={CARD_SHADOW_STYLE} bodyStyle={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '24px 24px 16px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="Search by Tx ID, Sender, or Receiver..."
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            style={{ width: 300, borderRadius: 8, height: 40 }}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <Select
            value={typeFilter}
            onChange={handleTypeFilterChange}
            style={{ width: 150, height: 40 }}
            dropdownStyle={{ borderRadius: 8 }}
          >
            <Option value="all">All Types</Option>
            <Option value="deposit">Deposit</Option>
            <Option value="transfer">Transfer</Option>
          </Select>
          <RangePicker
            style={{ borderRadius: 8, height: 40 }}
            onChange={handleDateRangeChange}
          />
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
            dataSource={transactions}
            rowKey="id"
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
    </div>
  );
}
