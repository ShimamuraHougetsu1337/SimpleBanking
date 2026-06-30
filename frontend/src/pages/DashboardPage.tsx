import { Card, Statistic, Row, Col, Table, Typography, Tag, Space, Button } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  PlusOutlined,
  SwapOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

// Mock Data
const mockBalance = 24500000;
const mockIncome = 5200000;
const mockExpense = 1250000;

const mockTransactions = [
  {
    id: '1',
    createdAt: '2026-06-29T10:30:00Z',
    direction: 'credit',
    amount: '1500000',
    counterpartName: 'Salary Transfer',
    description: 'June 2026 Salary',
  },
  {
    id: '2',
    createdAt: '2026-06-28T15:45:00Z',
    direction: 'debit',
    amount: '350000',
    counterpartName: 'Starbucks',
    description: 'Coffee',
  },
  {
    id: '3',
    createdAt: '2026-06-27T09:15:00Z',
    direction: 'credit',
    amount: '500000',
    counterpartName: 'Jane Doe',
    description: 'Dinner split',
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  const formatVND = (amount: number | string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => <Text type="secondary">{new Date(date).toLocaleDateString('vi-VN')}</Text>,
    },
    {
      title: 'Counterpart',
      dataIndex: 'counterpartName',
      key: 'counterpartName',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="blue">Completed</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: string, record: any) => {
        const isCredit = record.direction === 'credit';
        return (
          <Text 
            strong 
            style={{ color: isCredit ? '#10B981' : '#EF4444', fontSize: '15px' }}
          >
            {isCredit ? '+' : '-'}{formatVND(amount)}
          </Text>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Overview</Title>
        <Space>
          <Button type="default" icon={<PlusOutlined />} style={{ borderRadius: 8 }}>Add Money</Button>
          <Button type="primary" icon={<SwapOutlined />} style={{ borderRadius: 8 }} onClick={() => navigate('/transfer')}>Transfer</Button>
        </Space>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ height: '100%' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 16 }}>Available Balance</Text>}
              value={mockBalance}
              formatter={(val) => <span style={{ fontWeight: 700, fontSize: 32, color: '#1e293b' }}>{formatVND(val as number)}</span>}
              prefix={<WalletOutlined style={{ color: '#3B82F6', marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ height: '100%' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 16 }}>Total Income</Text>}
              value={mockIncome}
              formatter={(val) => <span style={{ fontWeight: 600, fontSize: 24, color: '#10B981' }}>{formatVND(val as number)}</span>}
              prefix={<ArrowUpOutlined style={{ color: '#10B981', marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ height: '100%' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 16 }}>Total Expense</Text>}
              value={mockExpense}
              formatter={(val) => <span style={{ fontWeight: 600, fontSize: 24, color: '#EF4444' }}>{formatVND(val as number)}</span>}
              prefix={<ArrowDownOutlined style={{ color: '#EF4444', marginRight: 8 }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title={<Title level={4} style={{ margin: 0 }}>Recent Transactions</Title>} 
        variant="borderless"
        extra={<Button type="link" onClick={() => navigate('/transactions')}>View All</Button>}
      >
        <Table
          columns={columns}
          dataSource={mockTransactions}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
}
