import { Typography, Button } from 'antd';
import { CloseOutlined, RedoOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface TransactionFailedStateProps {
  errorMsg?: string;
  onClose: () => void;
  onRetry?: () => void;
}

export function TransactionFailedState({ errorMsg, onClose, onRetry }: TransactionFailedStateProps) {
  return (
    <div>
      {/* Failure Icon & Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32, marginTop: 12 }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          fontSize: 28,
          border: '2px solid #fecaca',
          marginBottom: 20
        }}>
          <CloseOutlined />
        </div>
        <Title level={3} style={{ margin: 0, color: '#1e293b', fontWeight: 700, textAlign: 'center' }}>
          Giao dịch thất bại!
        </Title>
        <Text type="secondary" style={{ textAlign: 'center', marginTop: 12, padding: '0 8px', fontSize: 14, lineHeight: '1.6' }}>
          {errorMsg || 'Đã có lỗi xảy ra trong quá trình xử lý giao dịch. Vui lòng thử lại sau.'}
        </Text>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {onRetry && (
          <Button
            type="primary"
            danger
            icon={<RedoOutlined />}
            onClick={onRetry}
            size="large"
            block
            style={{ borderRadius: 8, height: 46, fontWeight: 600 }}
          >
            Thử lại giao dịch
          </Button>
        )}
        <Button
          type="default"
          onClick={onClose}
          size="large"
          block
          style={{ borderRadius: 8, height: 46, fontWeight: 600, color: '#64748b' }}
        >
          Quay về
        </Button>
      </div>
    </div>
  );
}
