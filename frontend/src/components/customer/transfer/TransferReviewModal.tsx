import { Modal, Button, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface TransferReviewModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  pendingValues: any;
  selectedAccount: any;
  receiver: any;
}

export function TransferReviewModal({
  isOpen,
  onConfirm,
  onCancel,
  isPending,
  pendingValues,
  selectedAccount,
  receiver
}: TransferReviewModalProps) {
  const formatVND = (num: number | string) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num));

  return (
    <Modal
      title={null}
      open={isOpen}
      onCancel={onCancel}
      footer={[
        <Button 
          key="back" 
          onClick={onCancel} 
          disabled={isPending} 
          size="large" 
          style={{ borderRadius: 8, height: 44, padding: '0 24px' }}
        >
          Hủy
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={isPending} 
          onClick={onConfirm} 
          size="large" 
          style={{ 
            borderRadius: 8, 
            height: 44, 
            padding: '0 24px',
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)' 
          }}
        >
          Xác nhận chuyển tiền
        </Button>,
      ]}
      width={480}
      centered
      styles={{ body: { padding: '24px 24px 8px 24px', backgroundColor: '#ffffff' } }}
      closeIcon={true}
    >
      {pendingValues && selectedAccount && receiver && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={4} style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>
              Xác nhận chuyển tiền
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Vui lòng kiểm tra kỹ chi tiết giao dịch dưới đây
            </Text>
          </div>

          {/* Flow Indicator: Sender -> Receiver */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: '#f8fafc',
            borderRadius: 12,
            marginBottom: 24,
            border: '1px solid #f1f5f9'
          }}>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                Từ tài khoản
              </Text>
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>
                {selectedAccount.user?.fullName}
              </div>
              <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                {selectedAccount.accountNumber}
              </Text>
            </div>
            
            <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
                border: '1px solid #dbeafe'
              }}>
                <ArrowRightOutlined />
              </div>
            </div>

            <div style={{ textAlign: 'right', flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                Đến tài khoản
              </Text>
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>
                {receiver.ownerName}
              </div>
              <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                {receiver.accountNumber}
              </Text>
            </div>
          </div>

          {/* Transaction Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 4px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text type="secondary">Số tiền chuyển</Text>
              <Text strong style={{ color: '#1e293b' }}>{formatVND(pendingValues.amount)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text type="secondary">Phí dịch vụ</Text>
              <Text type="success" strong>Miễn phí</Text>
            </div>
            {pendingValues.description && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text type="secondary">Lời nhắn</Text>
                <Text style={{ color: '#1e293b', maxWidth: '65%', textAlign: 'right' }}>
                  {pendingValues.description}
                </Text>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: '#e2e8f0', margin: '20px 0' }} />

          {/* Total payment amount */}
          <div style={{
            background: '#f8fafc',
            borderRadius: 8,
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px dashed #cbd5e1',
            marginBottom: 16
          }}>
            <Text strong style={{ color: '#64748b' }}>Tổng số tiền thanh toán</Text>
            <Text style={{ fontSize: 20, color: '#3b82f6', fontWeight: 700 }}>
              {formatVND(pendingValues.amount)}
            </Text>
          </div>
        </div>
      )}
    </Modal>
  );
}

