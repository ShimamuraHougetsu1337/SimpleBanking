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
          title={<span style={{ color: '#64748b', fontWeight: 500 }}>Total Volume</span>}
          value={stats.totalVolume}
          formatter={(val) => formatVnd(val.toString())}
          prefix={<SwapOutlined style={{ color: '#3B82F6' }} />}
          valueStyle={{ color: '#1e293b', fontWeight: 700 }}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
        <Statistic
          title={<span style={{ color: '#64748b', fontWeight: 500 }}>Successful Txs</span>}
          value={stats.successfulCount}
          valueStyle={{ color: '#10B981', fontWeight: 700 }}
          prefix={<ArrowUpOutlined style={{ color: '#10B981' }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
        <Statistic
          title={<span style={{ color: '#64748b', fontWeight: 500 }}>Failed Txs</span>}
          value={stats.failedCount}
          valueStyle={{ color: '#EF4444', fontWeight: 700 }}
          prefix={<ArrowDownOutlined style={{ color: '#EF4444' }} />}
        />
      </Card>
    </Col>
  </Row>
);
