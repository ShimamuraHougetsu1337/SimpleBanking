import { Typography, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowDownOutlined, ArrowUpOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { TransactionRecord } from '@/types/transaction';
import { STATUS_CONFIG } from '@/types/transaction';
import { formatDate, formatVnd } from '@/utils/format';

const { Text } = Typography;

export function getTransactionColumns(
  onSelectTransaction: (record: TransactionRecord) => void
): ColumnsType<TransactionRecord> {
  return [
    {
      title: 'Đối tác giao dịch',
      key: 'counterpart',
      render: (_, record) => {
        const isCredit = record.direction === 'credit';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: isCredit ? '#d1fae5' : '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isCredit
                ? <ArrowDownOutlined style={{ color: '#059669', fontSize: 14 }} />
                : <ArrowUpOutlined style={{ color: '#dc2626', fontSize: 14 }} />
              }
            </div>
            <div>
              <Text strong style={{ fontSize: 14, color: '#1e293b', display: 'block', lineHeight: '1.4' }}>
                {record.counterpartName || 'Simple Bank'}
              </Text>
              <Text style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
                {record.counterpartAccount || '—'}
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Nội dung',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <Text style={{ fontSize: 13, color: '#475569' }}>
          {text || <Text type="secondary" italic style={{ fontSize: 13 }}>Không có nội dung</Text>}
        </Text>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      align: 'right',
      render: (date: string) => (
        <Text style={{ fontSize: 13, color: '#64748b', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {formatDate(date)}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status: string) => {
        const config = STATUS_CONFIG[status] ?? { color: 'default', label: status };
        return (
          <Tag
            color={config.color}
            style={{ borderRadius: 20, padding: '1px 10px', fontSize: 12, fontWeight: 500 }}
          >
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount: string, record) => {
        const isCredit = record.direction === 'credit';
        return (
          <Text
            strong
            style={{
              fontSize: 15,
              color: isCredit ? '#059669' : '#dc2626',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            {isCredit ? '+' : '-'}{formatVnd(amount)}
          </Text>
        );
      },
    },
    {
      title: '',
      key: 'action',
      align: 'center',
      width: 48,
      render: (_, record) => (
        <InfoCircleOutlined
          onClick={(e) => {
            e.stopPropagation();
            onSelectTransaction(record);
          }}
          style={{ color: '#94a3b8', fontSize: 16, cursor: 'pointer', transition: 'color 0.15s ease' }}
          className="tx-detail-icon"
        />
      ),
    },
  ];
}
