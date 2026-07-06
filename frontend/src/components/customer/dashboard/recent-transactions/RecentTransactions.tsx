import { Card, Typography, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { TransactionItem } from './TransactionItem';

const { Title } = Typography;

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



  return (
    <>
      <Card
        title={<Title level={4} style={{ margin: 0, color: '#1e293b' }}>Recent Transactions</Title>}
        variant="borderless"
        extra={<Button type="link" onClick={() => navigate(viewAllLink)} style={{ fontWeight: 500 }}>View All</Button>}
        styles={{ body: { padding: '0 24px' } }}
        style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {transactions.map((item) => (
            <TransactionItem key={item.id} item={item} />
          ))}
        </div>
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
