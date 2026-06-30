import { Card, Typography, Button, List, Avatar } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export interface Transaction {
  id: string;
  createdAt: string;
  direction: string;
  amount: string;
  counterpartName: string;
  description: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  viewAllLink?: string;
}

export function RecentTransactions({ transactions, viewAllLink = '/transactions' }: RecentTransactionsProps) {
  const navigate = useNavigate();

  const formatVND = (amount: number | string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  return (
    <>
      <Card
        title={<Title level={4} style={{ margin: 0, color: '#1e293b' }}>Recent Transactions</Title>}
        variant="borderless"
        extra={<Button type="link" onClick={() => navigate(viewAllLink)} style={{ fontWeight: 500 }}>View All</Button>}
        styles={{ body: { padding: '0 24px' } }}
        style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}
      >
        <List
          itemLayout="horizontal"
          dataSource={transactions}
          renderItem={(item) => {
            const isCredit = item.direction === 'credit';
            return (
              <List.Item
                style={{
                  padding: '20px 0',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background-color 0.2s',
                  cursor: 'pointer'
                }}
                className="transaction-list-item"
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      size={48}
                      style={{
                        backgroundColor: isCredit ? '#ECFDF5' : '#FEF2F2',
                        color: isCredit ? '#10B981' : '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      icon={isCredit ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    />
                  }
                  title={
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
                  }
                  description={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 14 }}>{item.description}</Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>

      <style>{`
        .transaction-list-item:hover {
          background-color: #F8FAFC;
          border-radius: 8px;
          margin: 0 -12px;
          padding-left: 12px !important;
          padding-right: 12px !important;
        }
        .transaction-list-item:last-child {
          border-bottom: none !important;
        }
      `}</style>
    </>
  );
}
