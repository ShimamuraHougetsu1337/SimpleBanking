import { Table, Tag, Typography, Card } from 'antd';
import { useState } from 'react';
import { useTransactions } from '../hooks/client/useTransactions';

const { Title, Text } = Typography;

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransactions({ page, limit: 10 });

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
        if (val === 'success') {
          color = 'green';
          statusText = 'THÀNH CÔNG';
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
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      <Title level={2} style={{ marginBottom: 24 }}>Lịch sử giao dịch</Title>
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
