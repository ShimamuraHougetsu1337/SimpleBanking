import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Spin, Empty, Button, Table, DatePicker, Input, Space, Row, Col, Card, Tag } from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import api from '@/services/api';
const { Text } = Typography;
const { RangePicker } = DatePicker;

interface Account {
  id: string;
  accountNumber: string;
  name: string;
  balance: string;
  currency: string;
  user?: {
    fullName: string;
  };
}

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [account, setAccount] = useState<Account | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [search, setSearch] = useState('');

  const fetchAccount = async () => {
    try {
      const res = await api.get(`/accounts/${id}`);
      setAccount(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAccountLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!id) return;
    setTxLoading(true);
    try {
      const params: any = { accountId: id, limit: 50 };
      if (search) {
        params['filter[search]'] = search;
      }
      if (dateRange) {
        params['filter[fromDate]'] = dateRange[0];
        params['filter[toDate]'] = dateRange[1];
      }

      const res = await api.get('/transactions', { params });
      setTransactions(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, [id]);

  useEffect(() => {
    fetchTransactions();
  }, [id, search, dateRange]);

  if (accountLoading) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  if (!account) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Empty description="Account not found" />
        <Button type="primary" onClick={() => navigate('/accounts')} style={{ marginTop: 20 }}>
          Back to Accounts
        </Button>
      </div>
    );
  }

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => new Date(val).toLocaleString(),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (val: string) => <Text strong>{val || 'N/A'}</Text>,
    },
    {
      title: 'Counterpart',
      dataIndex: 'counterpartName',
      key: 'counterpartName',
      render: (val: string, record: any) => (
        <div>
          <div>{val}</div>
          <Text type="secondary" style={{ fontSize: '0.85em' }}>
            {record.counterpartAccount}
          </Text>
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: string, record: any) => {
        const amountNum = Number(val);
        const isCredit = record.direction === 'credit';
        const formatted = new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(amountNum);

        return (
          <Text type={isCredit ? 'success' : 'danger'} strong style={{ fontVariantNumeric: 'tabular-nums' }}>
            {isCredit ? '+' : '-'}{formatted}
          </Text>
        );
      },
      align: 'right' as const,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => {
        let color = 'default';
        if (val === 'completed') color = 'green';
        if (val === 'failed') color = 'red';
        if (val === 'pending') color = 'orange';
        return <Tag color={color}>{val.toUpperCase()}</Tag>;
      },
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ textAlign: 'left', marginBottom: 20 }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/accounts')}
          style={{ padding: 0 }}
        >
          Back to Accounts
        </Button>
      </div>

      <Card title="Transactions" bordered={false}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
              <Input
                placeholder="Search by description"
                prefix={<SearchOutlined />}
                allowClear
                onPressEnter={(e: any) => setSearch(e.target.value)}
                onBlur={(e: any) => setSearch(e.target.value)}
              />
            </Col>
            <Col xs={24} sm={12}>
              <RangePicker
                style={{ width: '100%' }}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([
                      dates[0].toISOString(),
                      dates[1].toISOString(),
                    ]);
                  } else {
                    setDateRange(null);
                  }
                }}
              />
            </Col>
          </Row>

          <Table
            dataSource={transactions}
            columns={columns}
            rowKey="id"
            loading={txLoading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
        </Space>
      </Card>
    </div>
  );
}
