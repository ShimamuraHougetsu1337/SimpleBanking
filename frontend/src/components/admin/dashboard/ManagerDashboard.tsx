import { Card, Row, Col, Typography, Statistic, Table } from 'antd';
import {
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  TransactionOutlined,
} from '@ant-design/icons';
import { formatVnd } from '@/utils/format';
import type { DashboardStats } from '@/services/admin.service';

const { Title, Text } = Typography;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
};

interface ManagerDashboardProps {
  stats: DashboardStats;
}

export default function ManagerDashboard({ stats }: ManagerDashboardProps) {
  const tellerColumns = [
    {
      title: 'Nhân viên (Teller)',
      key: 'teller',
      render: (record: { tellerName: string; tellerEmail: string }) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{record.tellerName}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{record.tellerEmail}</div>
        </div>
      ),
    },
    {
      title: 'Lệnh đã duyệt hôm nay',
      dataIndex: 'completedCount',
      key: 'completedCount',
      align: 'center' as const,
      render: (count: number) => <span style={{ fontWeight: 600, color: '#10B981' }}>{count}</span>,
    },
    {
      title: 'Lệnh đang chờ duyệt',
      dataIndex: 'pendingCount',
      key: 'pendingCount',
      align: 'center' as const,
      render: (count: number) => <span style={{ fontWeight: 600, color: '#D97706' }}>{count}</span>,
    },
    {
      title: 'Lệnh đã từ chối',
      dataIndex: 'rejectedCount',
      key: 'rejectedCount',
      align: 'center' as const,
      render: (count: number) => <span style={{ color: '#EF4444' }}>{count}</span>,
    },
    {
      title: 'Tổng doanh số duyệt',
      dataIndex: 'totalVolume',
      key: 'totalVolume',
      align: 'right' as const,
      render: (vol: string) => <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatVnd(vol)}</span>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Giám Sát Hoạt Động Chi Nhánh</Title>
        <Text type="secondary">Tổng quan dòng tiền giao dịch thực tế và năng suất của các Teller hôm nay</Text>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '20px' } }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Yêu cầu chờ duyệt</span>}
              value={stats.pendingRequestsCount ?? 0}
              prefix={<ClockCircleOutlined style={{ color: '#D97706' }} />}
              valueStyle={{ color: '#D97706', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '20px' } }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Tổng nạp trong ngày</span>}
              value={stats.totalDepositsToday ?? '0'}
              formatter={(value) => formatVnd(value.toString())}
              prefix={<ArrowUpOutlined style={{ color: '#10B981' }} />}
              valueStyle={{ color: '#10B981', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '20px' } }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Tổng rút trong ngày</span>}
              value={stats.totalWithdrawalsToday ?? '0'}
              formatter={(value) => formatVnd(value.toString())}
              prefix={<ArrowDownOutlined style={{ color: '#EF4444' }} />}
              valueStyle={{ color: '#EF4444', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '20px' } }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontWeight: 500 }}>Dòng tiền thuần tại quầy</span>}
              value={stats.netCashFlowToday ?? '0'}
              formatter={(value) => formatVnd(value.toString())}
              prefix={<TransactionOutlined style={{ color: '#3B82F6' }} />}
              valueStyle={{ color: '#3B82F6', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: 20 }}>Hiệu suất làm việc của các Teller</Title>
        <Table
          dataSource={stats.tellerPerformance ?? []}
          columns={tellerColumns}
          rowKey="tellerId"
          pagination={false}
          bordered={false}
          size="middle"
        />
      </Card>
    </div>
  );
}
