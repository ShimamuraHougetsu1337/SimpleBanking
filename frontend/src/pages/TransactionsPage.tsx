import { Card, Typography } from 'antd';
const { Title } = Typography;

export default function TransactionsPage() {
  return (
    <Card bordered={false} style={{ borderRadius: 12 }}>
      <Title level={2} style={{ marginTop: 0 }}>Transaction History</Title>
      <p>Transactions table goes here...</p>
    </Card>
  );
}
