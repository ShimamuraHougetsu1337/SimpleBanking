import { Typography, Button } from 'antd';
import { CheckOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

export interface TxData {
  id: string;
  type: 'transfer' | 'deposit' | 'withdraw';
  amount: number | string;
  fromAccount?: string;
  toAccount?: string;
  description?: string;
  createdAt: string;
}

interface TransactionSuccessStateProps {
  txData?: TxData;
  onClose: () => void;
}

export function TransactionSuccessState({ txData, onClose }: TransactionSuccessStateProps) {
  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val));
  };

  const getTxTypeLabel = (type?: string) => {
    switch (type) {
      case 'transfer': return 'Chuyển khoản';
      case 'deposit': return 'Nạp tiền';
      case 'withdraw': return 'Rút tiền';
      default: return 'Giao dịch';
    }
  };

  return (
    <div>
      {/* Success Icon & Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#ecfdf5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#10b981',
          fontSize: 28,
          border: '2px solid #a7f3d0',
          marginBottom: 16
        }}>
          <CheckOutlined />
        </div>
        <Title level={3} style={{ margin: 0, color: '#1e293b', fontWeight: 700, textAlign: 'center' }}>
          Giao dịch thành công!
        </Title>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', marginTop: 12 }}>
          {formatCurrency(txData?.amount || 0)}
        </div>
      </div>

      {/* Receipt Details Box */}
      <div style={{
        background: '#f8fafc',
        borderRadius: 12,
        border: '1px solid #f1f5f9',
        padding: '16px 20px',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>Loại giao dịch</Text>
          <Text strong style={{ color: '#1e293b', fontSize: 13 }}>{getTxTypeLabel(txData?.type)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>Mã giao dịch</Text>
          <Text copyable={{ text: txData?.id }} style={{ fontFamily: 'monospace', color: '#1e293b', fontSize: 13 }}>
            {txData?.id ? `${txData?.id.slice(0, 8)}...${txData?.id.slice(-8)}` : 'N/A'}
          </Text>
        </div>
        {txData?.fromAccount && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Từ tài khoản</Text>
            <Text strong style={{ fontFamily: 'monospace', color: '#1e293b', fontSize: 13 }}>{txData.fromAccount}</Text>
          </div>
        )}
        {txData?.toAccount && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Đến tài khoản</Text>
            <Text strong style={{ fontFamily: 'monospace', color: '#1e293b', fontSize: 13 }}>{txData.toAccount}</Text>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>Nội dung</Text>
          <Text style={{ color: '#1e293b', fontSize: 13, maxWidth: '65%', textAlign: 'right' }}>{txData?.description || 'Không có lời nhắn'}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>Thời gian</Text>
          <Text style={{ color: '#1e293b', fontSize: 13 }}>{txData?.createdAt ? new Date(txData.createdAt).toLocaleString('vi-VN') : 'Vừa xong'}</Text>
        </div>
      </div>

      {/* Action Button */}
      <Button
        type="primary"
        onClick={onClose}
        size="large"
        block
        style={{ borderRadius: 8, height: 46, fontWeight: 600, boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)' }}
      >
        Quay lại
      </Button>
    </div>
  );
}
