import { Card, Typography } from 'antd';
const { Title } = Typography;

export default function TransferPage() {
  return (
    <Card bordered={false} style={{ borderRadius: 12 }}>
      <Title level={2} style={{ marginTop: 0 }}>Transfer Money</Title>
      <p>Transfer form goes here...</p>
    </Card>
  );
}
