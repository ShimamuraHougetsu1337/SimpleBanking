import { Card, Typography, Table, ConfigProvider, Button, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdminLedger } from '@/hooks/admin/useAdminLedger';
import type { LedgerEntryRecord } from '@/types/admin';
import { formatVnd } from '@/utils/format';

const { Title, Text } = Typography;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
};

export default function AdminAccountLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    ledgerEntries,
    total,
    page,
    pageSize,
    handlePageChange,
    isLoading,
  } = useAdminLedger(id);

  const columns = [
    {
      title: 'Mã Giao Dịch',
      dataIndex: 'transactionId',
      key: 'transactionId',
      render: (text: string) => (
        <Text style={{ fontFamily: 'monospace', color: '#64748b' }}>
          {text ? text.slice(0, 8) + '...' : '-'}
        </Text>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
          {new Date(date).toLocaleString('vi-VN')}
        </Text>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      align: 'center' as const,
      render: (type: string) => {
        let color = 'default';
        let label = type;
        if (type.toUpperCase() === 'CREDIT') {
          color = 'success';
          label = 'CREDIT';
        } else if (type.toUpperCase() === 'DEBIT') {
          color = 'error';
          label = 'DEBIT';
        }
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: string, record: LedgerEntryRecord) => {
        const isCredit = record.type.toUpperCase() === 'CREDIT';
        return (
          <Text
            strong
            style={{
              fontVariantNumeric: 'tabular-nums',
              color: isCredit ? '#10B981' : '#EF4444',
            }}
          >
            {isCredit ? '+' : '-'}{formatVnd(amount)}
          </Text>
        );
      },
    },
    {
      title: 'Số dư sau GD',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      align: 'right' as const,
      render: (balance: string) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatVnd(balance)}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ marginRight: 16 }}
        />
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>
          Sổ Cái Tài Khoản
        </Title>
      </div>

      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        <ConfigProvider
          theme={{
            components: {
              Table: {
                headerBg: '#F8FAFC',
                headerColor: '#64748b',
                headerSplitColor: 'transparent',
                rowHoverBg: '#F8FAFC',
                cellPaddingBlock: 16,
                cellPaddingInline: 20,
              },
            },
          }}
        >
          <Table
            columns={columns}
            dataSource={ledgerEntries}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              onChange: handlePageChange,
            }}
          />
        </ConfigProvider>
      </Card>
    </div>
  );
}
