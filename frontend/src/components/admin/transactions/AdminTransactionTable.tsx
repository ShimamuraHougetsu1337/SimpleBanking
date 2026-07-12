import { useState } from 'react';
import { Table, Typography, Tag, Space, ConfigProvider, Button, Modal, Descriptions } from 'antd';
import { RollbackOutlined, EyeOutlined } from '@ant-design/icons';
import { formatVnd } from '@/utils/format';
import type { AdminTransaction } from '@/types/admin';

const { Text } = Typography;

export const getColumns = (
  onReverse: (id: string) => void,
  onViewDetails: (record: AdminTransaction) => void,
) => [
  {
    title: 'Transaction ID',
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
      <Space orientation="vertical" size={0} align="center">
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
      <Space orientation="vertical" size={0} align="center">
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
      <Space orientation="vertical" size={0} align="center">
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
      <Tag variant="filled" color={type === 'deposit' ? 'blue' : type === 'reversal' ? 'purple' : 'default'} style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>
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
      return <Tag variant="filled" color={color} style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>{status.toUpperCase()}</Tag>;
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
  {
    title: 'Hành động',
    key: 'action',
    align: 'center' as const,
    render: (record: AdminTransaction) => {
      const isReversible = record.status === 'completed' && record.type === 'transfer';

      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => onViewDetails(record)}
            style={{ color: '#3b82f6' }}
            title="Chi tiết"
          />
          {isReversible && (
            <Button
              type="text"
              danger
              icon={<RollbackOutlined />}
              onClick={() => Modal.confirm({
                title: 'Xác nhận hoàn tác giao dịch?',
                content: `Bạn có chắc chắn muốn hoàn tác giao dịch ${record.id} không? Hành động này sẽ tạo ra một giao dịch bù trừ mới.`,
                okText: 'Hoàn tác',
                okType: 'danger',
                cancelText: 'Hủy',
                onOk: () => onReverse(record.id)
              })}
              title="Hoàn tác"
            />
          )}
        </div>
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
  onReverse: (id: string) => void;
}

export const AdminTransactionTable = ({
  transactions,
  page,
  pageSize,
  total,
  onPageChange,
  onReverse,
}: AdminTransactionTableProps) => {
  const [selectedTx, setSelectedTx] = useState<AdminTransaction | null>(null);

  return (
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
        columns={getColumns(onReverse, (record) => setSelectedTx(record))}
        dataSource={transactions}
        rowKey="id"
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          onChange: onPageChange,
          showTotal: (total) => (
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              {total} giao dịch
            </Text>
          ),
          placement: ['bottomCenter'] as any,
          style: { padding: '16px 24px', margin: 0 },
        }}
      />

      <Modal
        title={<span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Chi Tiết Giao Dịch</span>}
        open={!!selectedTx}
        onCancel={() => setSelectedTx(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setSelectedTx(null)}>
            Đóng
          </Button>
        ]}
        width={550}
        styles={{ body: { paddingTop: 8 } }}
      >
        {selectedTx && (
          <Descriptions column={1} bordered size="small" style={{ borderRadius: 8, overflow: 'hidden' }}>
            <Descriptions.Item label="Mã giao dịch">
              <Text copyable>{selectedTx.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian">
              {new Date(selectedTx.createdAt).toLocaleDateString('vi-VN')} {new Date(selectedTx.createdAt).toLocaleTimeString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Loại">
              <Tag variant="filled" color={selectedTx.type === 'deposit' ? 'blue' : selectedTx.type === 'reversal' ? 'purple' : 'default'}>
                {selectedTx.type.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag variant="filled" color={selectedTx.status === 'completed' ? 'success' : selectedTx.status === 'failed' ? 'error' : 'warning'}>
                {selectedTx.status.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Người gửi">
              {selectedTx.fromAccount ? (
                <Space direction="vertical" size={0}>
                  <Text strong>{selectedTx.fromUserName}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{selectedTx.fromAccount}</Text>
                </Space>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Người nhận">
              {selectedTx.toAccount ? (
                <Space direction="vertical" size={0}>
                  <Text strong>{selectedTx.toUserName}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{selectedTx.toAccount}</Text>
                </Space>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Số tiền">
              <Text strong>{formatVnd(selectedTx.amount)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Phí">
              {selectedTx.type === 'transfer' ? formatVnd(selectedTx.fee || '0') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng cộng">
              <Text strong style={{ color: '#dc2626' }}>
                {formatVnd(selectedTx.totalAmount || selectedTx.amount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả">
              {selectedTx.description || '-'}
            </Descriptions.Item>
            {selectedTx.originalTransactionId && (
              <Descriptions.Item label="Giao dịch gốc (Được hoàn tác)">
                <Text type="danger" copyable>{selectedTx.originalTransactionId}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </ConfigProvider>
  );
};
