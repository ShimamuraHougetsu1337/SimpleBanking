import { Typography, Tag, Divider } from 'antd';

const { Text } = Typography;

interface Props {
  metadata: Record<string, unknown> | null | undefined;
}

/** Render một giá trị metadata thành dạng đẹp tùy theo kiểu dữ liệu */
function MetadataValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <Tag style={{ fontFamily: 'monospace', fontSize: 12 }}>null</Tag>;
  }
  if (typeof value === 'boolean') {
    return (
      <Tag color={value ? 'success' : 'error'} style={{ fontSize: 12 }}>
        {value ? 'true' : 'false'}
      </Tag>
    );
  }
  if (typeof value === 'object') {
    // Render object lồng nhau (e.g., oldValues / newValues) dưới dạng sub-table
    return (
      <div
        style={{
          marginTop: 4,
          paddingLeft: 12,
          borderLeft: '2px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#64748b', minWidth: 120 }}>
              {LABEL_MAP[k] ?? k}
            </Text>
            <MetadataValue value={v} />
          </div>
        ))}
      </div>
    );
  }
  // Số hoặc chuỗi
  return (
    <Text
      style={{
        fontFamily: 'monospace',
        fontSize: 12,
        background: '#f1f5f9',
        padding: '1px 6px',
        borderRadius: 4,
        color: '#0f172a',
      }}
    >
      {String(value)}
    </Text>
  );
}

const LABEL_MAP: Record<string, string> = {
  timestamp: 'Thời gian',
  action: 'Hành động',
  actor: 'Người thực hiện',
  type: 'Loại',
  id: 'ID',
  context: 'Ngữ cảnh hệ thống',
  ip_address: 'Địa chỉ IP',
  user_agent: 'User Agent',
  data_changes: 'Thay đổi dữ liệu',
  old_data: 'Dữ liệu cũ',
  new_data: 'Dữ liệu mới',
  outcome: 'Kết quả xử lý',
  status: 'Trạng thái',
  error_code: 'Mã lỗi',
  error_message: 'Thông báo lỗi'
};

export default function AuditMetadataViewer({ metadata }: Props) {
  if (!metadata) {
    return (
      <Text type="secondary" style={{ fontSize: 13 }}>
        Không có dữ liệu metadata cho hành động này.
      </Text>
    );
  }

  const entries = Object.entries(metadata);

  return (
    <div
      style={{
        background: '#f8fafc',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        padding: '12px 16px',
      }}
    >
      <Text
        strong
        style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}
      >
        Metadata chi tiết
      </Text>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map(([key, value]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 160 }}>
              <Text strong style={{ fontSize: 12, color: '#334155' }}>
                {LABEL_MAP[key] ?? key}
              </Text>
            </div>
            <div style={{ flex: 1 }}>
              <MetadataValue value={value} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
