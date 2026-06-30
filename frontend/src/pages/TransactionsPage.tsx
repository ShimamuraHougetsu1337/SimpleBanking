import { Table, Tag, Typography, Card } from 'antd';
import { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';

const { Title, Text } = Typography;

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransactions({ page, limit: 10 });

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => new Date(val).toLocaleString('vi-VN'),
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
        if (val === 'success') color = 'green';
        if (val === 'failed') color = 'red';
        if (val === 'pending') color = 'orange';
        return <Tag color={color}>{val.toUpperCase()}</Tag>;
      },
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      <Title level={2} style={{ marginBottom: 24 }}>Transaction History</Title>
      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={data?.data}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: 10,
            total: data?.meta?.total,
            onChange: setPage,
            showSizeChanger: false,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
