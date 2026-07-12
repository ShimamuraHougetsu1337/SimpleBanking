import { Card, Row, Col, Typography, Statistic } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  TransactionOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
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

interface TellerDashboardProps {
  stats: DashboardStats;
}

export default function TellerDashboard({ stats }: TellerDashboardProps) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Hiệu Suất Làm Việc Hôm Nay</Title>
        <Text type="secondary">Theo dõi các giao dịch và yêu cầu do bạn thực hiện trong ngày hôm nay</Text>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Tổng tiền nạp hôm nay</span>}
              value={stats.todayDepositsVolume ?? '0'}
              formatter={(value) => formatVnd(value.toString())}
              prefix={<ArrowUpOutlined style={{ color: '#10B981' }} />}
              styles={{ content: { color: '#10B981', fontWeight: 700 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Tổng tiền rút hôm nay</span>}
              value={stats.todayWithdrawalsVolume ?? '0'}
              formatter={(value) => formatVnd(value.toString())}
              prefix={<ArrowDownOutlined style={{ color: '#EF4444' }} />}
              styles={{ content: { color: '#EF4444', fontWeight: 700 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Số giao dịch hoàn thành</span>}
              value={stats.todayCompletedCount ?? 0}
              prefix={<TransactionOutlined style={{ color: '#3B82F6' }} />}
              styles={{ content: { color: '#3B82F6', fontWeight: 700 } }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: 24 }}>Trạng thái yêu cầu giao dịch chờ duyệt</Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={8}>
            <Card style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px' }} styles={{ body: { padding: '20px' } }}>
              <Statistic
                title={<span style={{ color: '#D97706', fontWeight: 600 }}>Đang chờ duyệt</span>}
                value={stats.pendingCount ?? 0}
                prefix={<ClockCircleOutlined style={{ color: '#D97706' }} />}
                valueStyle={{ color: '#D97706', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '12px' }} styles={{ body: { padding: '20px' } }}>
              <Statistic
                title={<span style={{ color: '#059669', fontWeight: 600 }}>Được phê duyệt hôm nay</span>}
                value={stats.approvedCount ?? 0}
                prefix={<CheckCircleOutlined style={{ color: '#059669' }} />}
                valueStyle={{ color: '#059669', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px' }} styles={{ body: { padding: '20px' } }}>
              <Statistic
                title={<span style={{ color: '#DC2626', fontWeight: 600 }}>Bị từ chối hôm nay</span>}
                value={stats.rejectedCount ?? 0}
                prefix={<CloseCircleOutlined style={{ color: '#DC2626' }} />}
                valueStyle={{ color: '#DC2626', fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
