import { useState } from 'react';
import { Card, Space, Row, Col, Input, DatePicker, Table, Typography, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface AccountTransactionsProps {
  accountId: string;
}

export function AccountTransactions({ accountId }: AccountTransactionsProps) {
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [search, setSearch] = useState('');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', accountId, search, dateRange],
    queryFn: async () => {
      if (!accountId) return [];
      const params: any = { accountId, limit: 50 };
      if (search) {
        params['filter[search]'] = search;
      }
      if (dateRange) {
        params['filter[fromDate]'] = dateRange[0];
        params['filter[toDate]'] = dateRange[1];
      }

      const res = await api.get('/transactions', { params });
      return res.data.data;
    },
    enabled: !!accountId,
  });

  const columns = [
    {
      title: 'Ngày giao dịch',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => new Date(val).toLocaleString('vi-VN'),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (val: string) => <Text strong>{val || 'N/A'}</Text>,
    },
    {
      title: 'Đối tác',
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
      title: 'Số tiền',
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
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => {
        let color = 'default';
        let statusText = val.toUpperCase();
        if (val === 'completed') {
          color = 'green';
          statusText = 'HOÀN THÀNH';
        }
        if (val === 'failed') {
          color = 'red';
          statusText = 'THẤT BẠI';
        }
        if (val === 'pending') {
          color = 'orange';
          statusText = 'ĐANG XỬ LÝ';
        }
        return <Tag color={color}>{statusText}</Tag>;
      },
    },
  ];

  return (
    <Card title="Lịch sử giao dịch" bordered={false}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
            <Input
              placeholder="Tìm kiếm theo mô tả"
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
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Space>
    </Card>
  );
}
