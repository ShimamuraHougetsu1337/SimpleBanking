import { Card, Col, Row, Statistic } from 'antd';
import { SwapOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { formatVnd } from '@/utils/format';
import { CARD_SHADOW_STYLE } from './admin-transactions.constants';

interface AdminTransactionStatsProps {
  stats: {
    totalVolume: number | string;
    successfulCount: number;
    failedCount: number;
  };
}

export const AdminTransactionStats = ({ stats }: AdminTransactionStatsProps) => (
  <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
    <Col xs={24} sm={8}>
      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
        <Statistic
          title={<span style={{ color: '#64748b', fontWeight: 500 }}>Tổng giá trị giao dịch</span>}
          value={stats.totalVolume}
          formatter={(val) => formatVnd(val.toString())}
          prefix={<SwapOutlined style={{ color: '#3B82F6' }} />}
          styles={{ content: { color: '#1e293b', fontWeight: 700 } }}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
        <Statistic
          title={<span style={{ color: '#64748b', fontWeight: 500 }}>Giao dịch thành công</span>}
          value={stats.successfulCount}
          styles={{ content: { color: '#10B981', fontWeight: 700 } }}
          prefix={<ArrowUpOutlined style={{ color: '#10B981' }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
        <Statistic
          title={<span style={{ color: '#64748b', fontWeight: 500 }}>Giao dịch thất bại</span>}
          value={stats.failedCount}
          styles={{ content: { color: '#EF4444', fontWeight: 700 } }}
          prefix={<ArrowDownOutlined style={{ color: '#EF4444' }} />}
        />
      </Card>
    </Col>
  </Row>
);
