import { Card, Row, Col, Typography, Statistic } from 'antd';
import {
  UsergroupAddOutlined,
  BankOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { formatVnd } from '@/utils/format';
import type { DashboardStats } from '@/types/admin';

const { Title, Text } = Typography;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
};

interface SystemDashboardProps {
  stats: DashboardStats;
}

export default function SystemDashboard({ stats }: SystemDashboardProps) {
  // Find max volume to render simple HTML bars
  const maxVolume = Math.max(...stats.weeklyVolume.map(d => Number(d.volume)), 1);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Tổng Quan Dashboard</Title>
        <Text type="secondary">Thống kê toàn hệ thống và các hoạt động gần đây</Text>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Tổng số người dùng</span>}
              value={stats.totalUsers}
              prefix={<UsergroupAddOutlined style={{ color: '#3B82F6' }} />}
              styles={{ content: { color: '#1e293b', fontWeight: 700 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Tổng số tài khoản</span>}
              value={stats.totalAccounts}
              prefix={<BankOutlined style={{ color: '#10B981' }} />}
              styles={{ content: { color: '#10B981', fontWeight: 700 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Tổng số dư hệ thống</span>}
              value={stats.totalBalance}
              formatter={(value) => formatVnd(value.toString())}
              prefix={<WalletOutlined style={{ color: '#8B5CF6' }} />}
              styles={{ content: { color: '#8B5CF6', fontWeight: 700, fontSize: 20 } }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: 24 }}>Khối lượng giao dịch hàng tuần</Title>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stats.weeklyVolume.map((item) => {
            const percentage = (Number(item.volume) / maxVolume) * 100;
            return (
              <div key={item.date} style={{ display: 'flex', alignItems: 'center', padding: '6px 0' }}>
                <Text style={{ width: 100, color: '#64748b', flexShrink: 0 }}>
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
                  {formatVnd(item.volume)}
                </Text>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
