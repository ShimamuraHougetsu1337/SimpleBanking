import { Typography, Avatar } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { Transaction } from './RecentTransactions';

const { Text } = Typography;

interface TransactionItemProps {
  item: Transaction;
}

export function TransactionItem({ item }: TransactionItemProps) {
  const isCredit = item.direction === 'credit';

  const formatVND = (amount: number | string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  const formattedDate = new Date(item.createdAt).toLocaleDateString('vi-VN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      style={{
        padding: '20px 0',
        borderBottom: '1px solid #f1f5f9',
        transition: 'background-color 0.2s',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
      className="transaction-list-item"
    >
      <Avatar
        size={48}
        style={{
          backgroundColor: isCredit ? '#ECFDF5' : '#FEF2F2',
          color: isCredit ? '#10B981' : '#EF4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        icon={isCredit ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text strong style={{ fontSize: 16, color: '#1e293b' }}>{item.counterpartName}</Text>
          <Text
            strong
            style={{
              color: isCredit ? '#10B981' : '#1e293b',
              fontSize: 16
            }}
          >
            {isCredit ? '+' : '-'}{formatVND(item.amount)}
          </Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 14 }}>{item.description}</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {formattedDate}
          </Text>
        </div>
      </div>
    </div>
  );
}
