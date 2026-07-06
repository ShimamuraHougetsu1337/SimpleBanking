import { Modal, Descriptions, Tag, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import type { TransactionRecord } from '@/types/transaction';
import { STATUS_CONFIG } from '@/types/transaction';
import { formatDate, formatVnd } from '@/utils/format';

const { Text } = Typography;

interface TransactionDetailModalProps {
  transaction: TransactionRecord | null;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  if (!transaction) return null;

  const isCredit = transaction.direction === 'credit';
  const statusConfig = STATUS_CONFIG[transaction.status] ?? { color: 'orange', label: transaction.status };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: isCredit ? '#d1fae5' : '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isCredit
              ? <ArrowDownOutlined style={{ color: '#059669', fontSize: 14 }} />
              : <ArrowUpOutlined style={{ color: '#dc2626', fontSize: 14 }} />
            }
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Chi tiết giao dịch</span>
        </div>
      }
      open={true}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnHidden
      styles={{ body: { padding: '8px 0 16px' } }}
    >
      {/* Amount hero */}
      <div style={detailStyles.amountHero}>
        <Text style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>
          {isCredit ? 'Số tiền nhận' : 'Số tiền chuyển'}
        </Text>
        <Text
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: isCredit ? '#059669' : '#dc2626',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.03em',
          }}
        >
          {isCredit ? '+' : '-'}{formatVnd(isCredit ? transaction.amount : (transaction.totalAmount || transaction.amount))}
        </Text>
      </div>

      <Descriptions
        column={1}
        bordered
        size="middle"
        styles={{ label: { width: 140, fontWeight: 500, color: '#64748b', fontSize: 13 }, content: { fontSize: 13 } }}
      >
        <Descriptions.Item label="Mã giao dịch">
          <Text copyable style={{ fontFamily: 'monospace', fontSize: 12, color: '#334155' }}>
            {transaction.id}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Loại giao dịch">
          <Tag color={transaction.type === 'transfer' ? 'blue' : transaction.type === 'deposit' ? 'green' : 'volcano'}>
            {transaction.type === 'transfer' ? 'Chuyển khoản' : transaction.type === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label={isCredit ? 'Tài khoản gửi' : 'Tài khoản nhận'}>
          <Text style={{ fontFamily: 'monospace' }}>{transaction.counterpartAccount || 'N/A'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={isCredit ? 'Người gửi' : 'Người nhận'}>
          {transaction.counterpartName || 'N/A'}
        </Descriptions.Item>
        {transaction.type === 'transfer' && !isCredit && (
          <>
            <Descriptions.Item label="Số tiền chuyển">
              {formatVnd(transaction.amount)}
            </Descriptions.Item>
            <Descriptions.Item label="Phí giao dịch">
              {Number(transaction.fee || 0) === 0 ? 'Miễn phí' : formatVnd(transaction.fee!)}
            </Descriptions.Item>
          </>
        )}
        <Descriptions.Item label="Nội dung">
          {transaction.description || <Text type="secondary" italic>Không có nội dung</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Thời gian">
          {formatDate(transaction.createdAt)}
        </Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <Tag color={statusConfig.color}>{statusConfig.label.toUpperCase()}</Tag>
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}

const detailStyles: Record<string, React.CSSProperties> = {
  amountHero: {
    textAlign: 'center',
    padding: '20px 24px 24px',
    background: '#f8fafc',
    borderRadius: 10,
    margin: '0 0 20px',
  },
};
