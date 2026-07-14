import { useState } from 'react';
import { Table, Typography, Tag, Space, ConfigProvider, Button, Modal, Descriptions } from 'antd';
import { RollbackOutlined, EyeOutlined, ExceptionOutlined } from '@ant-design/icons';
import { formatVnd } from '@/utils/format';
import type { AdminTransaction } from '@/types/admin';
import { RequestReversalModal } from './RequestReversalModal';

const { Text } = Typography;

const getColumns = (
  onReverse: (id: string) => void,
  onViewDetails: (record: AdminTransaction) => void,
  onRequestReversal: (record: AdminTransaction) => void,
  userRole: string,
) => [
  {
    title: <span style={{ whiteSpace: 'nowrap' }}>Mã giao dịch</span>,
    dataIndex: 'id',
    key: 'id',
    align: 'center' as const,
    width: 130,
    render: (id: string) => (
      <Text
        style={{ fontFamily: 'monospace', fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}
        copyable={{ text: id, tooltips: ['Sao chép mã', 'Đã sao chép!'] }}
      >
        {`#${id.substring(0, 8)}`}
      </Text>
    ),
  },
  {
    title: <span style={{ whiteSpace: 'nowrap' }}>Thời gian</span>,
    dataIndex: 'createdAt',
    key: 'createdAt',
    align: 'center' as const,
    width: 130,
    render: (date: string) => (
      <Space direction="vertical" size={2} align="center">
        <Text style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#0f172a', fontWeight: 500 }}>
          {new Date(date).toLocaleDateString('vi-VN')}
        </Text>
        <Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#64748b' }}>
          {new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Text>
      </Space>
    ),
  },
  {
    title: <span style={{ whiteSpace: 'nowrap' }}>Người gửi</span>,
    dataIndex: 'fromUserName',
    key: 'sender_name',
    align: 'center' as const,
    width: 160,
    render: (name: string, record: AdminTransaction) => (
      <Space direction="vertical" size={2} align="center">
        <Text strong style={{ color: '#0f172a', whiteSpace: 'nowrap' }}>{name || '-'}</Text>
        {record.fromAccount && (
          <Text
            type="secondary"
            style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', whiteSpace: 'nowrap' }}
            copyable={{ text: record.fromAccount, tooltips: ['Sao chép số tài khoản', 'Đã sao chép!'] }}
          >
            {record.fromAccount}
          </Text>
        )}
      </Space>
    ),
  },
  {
    title: <span style={{ whiteSpace: 'nowrap' }}>Người nhận</span>,
    dataIndex: 'toUserName',
    key: 'receiver_name',
    align: 'center' as const,
    width: 160,
    render: (name: string, record: AdminTransaction) => (
      <Space direction="vertical" size={2} align="center">
        <Text strong style={{ color: '#0f172a', whiteSpace: 'nowrap' }}>{name || '-'}</Text>
        {record.toAccount && (
          <Text
            type="secondary"
            style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', whiteSpace: 'nowrap' }}
            copyable={{ text: record.toAccount, tooltips: ['Sao chép số tài khoản', 'Đã sao chép!'] }}
          >
            {record.toAccount}
          </Text>
        )}
      </Space>
    ),
  },
  {
    title: <span style={{ whiteSpace: 'nowrap' }}>Phân loại</span>,
    dataIndex: 'type',
    key: 'type',
    align: 'center' as const,
    width: 100,
    render: (type: string) => {
      let color = 'default';
      if (type === 'deposit') color = 'blue';
      else if (type === 'withdraw') color = 'warning';
      else if (type === 'reversal') color = 'purple';
      else if (type === 'transfer') color = 'cyan';
      return (
        <Tag bordered={false} color={color} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, padding: '2px 8px' }}>
          {type.toUpperCase()}
        </Tag>
      );
    },
  },
  {
    title: <span style={{ whiteSpace: 'nowrap' }}>Trạng thái</span>,
    dataIndex: 'status',
    key: 'status',
    align: 'center' as const,
    width: 110,
    render: (status: string) => {
      let color = 'default';
      if (status === 'completed') color = 'success';
      else if (status === 'failed') color = 'error';
      else if (status === 'pending' || status === 'processing') color = 'processing';
      return (
        <Tag bordered={false} color={color} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, padding: '2px 8px' }}>
          {status.toUpperCase()}
        </Tag>
      );
    },
  },
  {
    title: <span style={{ whiteSpace: 'nowrap' }}>Số tiền</span>,
    dataIndex: 'amount',
    key: 'amount',
    align: 'center' as const,
    width: 130,
    render: (amount: string, record: AdminTransaction) => {
      const isNegative = record.type === 'withdraw';
      return (
        <Text strong style={{ fontSize: '14px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: isNegative ? '#b91c1c' : '#0f172a' }}>
          {isNegative ? '-' : ''}{formatVnd(amount)}
        </Text>
      );
    },
  },
  {
    title: <span style={{ whiteSpace: 'nowrap' }}>Phí</span>,
    dataIndex: 'fee',
    key: 'fee',
    align: 'center' as const,
    width: 100,
    render: (fee: string, record: AdminTransaction) => {
      const feeNum = Number(fee || 0);
      if (feeNum === 0 || record.type !== 'transfer') return <Text type="secondary" style={{ color: '#94a3b8' }}>-</Text>;
      return (
        <Text type="secondary" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#64748b' }}>
          {formatVnd(fee)}
        </Text>
      );
    },
  },
  {
    title: <span style={{ whiteSpace: 'nowrap' }}>Tổng cộng</span>,
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    align: 'center' as const,
    width: 130,
    render: (totalAmount: string, record: AdminTransaction) => {
      const val = totalAmount || record.amount;
      const isNegative = record.type === 'withdraw';
      return (
        <Text strong style={{ fontSize: '14px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: isNegative ? '#b91c1c' : '#0f172a' }}>
          {isNegative ? '-' : ''}{formatVnd(val)}
        </Text>
      );
    },
  },
  {
    title: <span style={{ whiteSpace: 'nowrap' }}>Hành động</span>,
    key: 'action',
    align: 'center' as const,
    width: 120,
    render: (_: unknown, record: AdminTransaction) => {
      const isCompletedTransfer = record.status === 'completed' && record.type === 'transfer';
      const canDirectReverse = isCompletedTransfer && (userRole === 'manager' || userRole === 'superadmin');
      const canRequestReversal = isCompletedTransfer;

      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
          <Button
            type="text"
            shape="circle"
            icon={<EyeOutlined />}
            onClick={() => onViewDetails(record)}
            style={{ color: '#64748b' }}
            title="Chi tiết"
          />
          {canRequestReversal && (
            <Button
              type="text"
              shape="circle"
              icon={<ExceptionOutlined />}
              onClick={() => onRequestReversal(record)}
              style={{ color: '#f59e0b' }}
              title="Yêu cầu hoàn tiền"
              id={`btn-request-reversal-${record.id}`}
            />
          )}
          {canDirectReverse && (
            <Button
              type="text"
              shape="circle"
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
              title="Hoàn tác trực tiếp (Manager)"
              id={`btn-direct-reverse-${record.id}`}
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
  onRequestReversal: (transactionId: string, reason: string) => void;
  userRole: string;
}

export const AdminTransactionTable = ({
  transactions,
  page,
  pageSize,
  total,
  onPageChange,
  onReverse,
  onRequestReversal,
  userRole,
}: AdminTransactionTableProps) => {
  const [selectedTx, setSelectedTx] = useState<AdminTransaction | null>(null);
  const [reversalTx, setReversalTx] = useState<AdminTransaction | null>(null);

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
        columns={getColumns(
          onReverse,
          (record) => setSelectedTx(record),
          (record) => setReversalTx(record),
          userRole,
        )}
        dataSource={transactions}
        rowKey="id"
        scroll={{ x: 1200 }}
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
          placement: ['bottomCenter'],
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
      <RequestReversalModal
        open={!!reversalTx}
        transaction={reversalTx}
        onCancel={() => setReversalTx(null)}
        onConfirm={(txId, reason) => {
          onRequestReversal(txId, reason);
          setReversalTx(null);
        }}
      />
    </ConfigProvider>
  );
};
