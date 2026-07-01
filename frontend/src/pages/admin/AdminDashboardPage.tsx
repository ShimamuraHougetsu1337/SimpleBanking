import { Card, Row, Col, Typography, Statistic, Spin, List } from 'antd';
import { useAdminStats } from '@/hooks/admin/useAdminStats';
import { UsergroupAddOutlined, WalletOutlined, BankOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
};

export default function AdminDashboardPage() {
  const { stats, loading } = useAdminStats();

  const formatVND = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Find max volume to render simple HTML bars
  const maxVolume = Math.max(...stats.weeklyVolume.map(d => Number(d.volume)), 1);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Dashboard Overview</Title>
        <Text type="secondary">System wide statistics and recent activities</Text>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={CARD_SHADOW_STYLE} bodyStyle={{ padding: '24px' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Total Users</span>}
              value={stats.totalUsers}
              prefix={<UsergroupAddOutlined style={{ color: '#3B82F6' }} />}
              valueStyle={{ color: '#1e293b', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={CARD_SHADOW_STYLE} bodyStyle={{ padding: '24px' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Total Accounts</span>}
              value={stats.totalAccounts}
              prefix={<BankOutlined style={{ color: '#10B981' }} />}
              valueStyle={{ color: '#10B981', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={CARD_SHADOW_STYLE} bodyStyle={{ padding: '24px' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Total System Balance</span>}
              value={stats.totalBalance}
              formatter={(value) => formatVND(value.toString())}
              prefix={<WalletOutlined style={{ color: '#8B5CF6' }} />}
              valueStyle={{ color: '#8B5CF6', fontWeight: 700, fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={CARD_SHADOW_STYLE} bodyStyle={{ padding: '24px' }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: 24 }}>Weekly Transaction Volume</Title>
        <List
          itemLayout="horizontal"
          dataSource={stats.weeklyVolume}
          renderItem={(item) => {
            const percentage = (Number(item.volume) / maxVolume) * 100;
            return (
              <List.Item>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                  <Text style={{ width: 100, color: '#64748b' }}>
                    {new Date(item.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })}
                  </Text>
                  <div style={{ flex: 1, margin: '0 16px', background: '#f1f5f9', borderRadius: 4, height: 16 }}>
                    <div
                      style={{
                        width: `${percentage}%`,
                        background: '#3B82F6',
                        height: '100%',
                        borderRadius: 4,
                        transition: 'width 0.5s ease-in-out',
                      }}
                    />
                  </div>
                  <Text style={{ width: 120, textAlign: 'right', fontWeight: 500 }}>
                    {formatVND(item.volume)}
                  </Text>
                </div>
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
}
