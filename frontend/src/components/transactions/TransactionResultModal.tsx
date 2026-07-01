import { Modal, Result, Button, Descriptions, Space, Typography, Card } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, HomeOutlined, RedoOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface TransactionResultProps {
  visible: boolean;
  status: 'success' | 'failed';
  errorMsg?: string;
  txData?: {
    id: string;
    type: 'transfer' | 'deposit' | 'withdraw';
    amount: number | string;
    fromAccount?: string;
    toAccount?: string;
    description?: string;
    createdAt: string;
  };
  onClose: () => void;
  onRetry?: () => void;
}

export function TransactionResultModal({
  visible,
  status,
  errorMsg,
  txData,
  onClose,
  onRetry,
}: TransactionResultProps) {
  const isSuccess = status === 'success';

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
    <Modal
      open={visible}
      footer={null}
      closable={false}
      centered
      width={500}
      styles={{ body: { padding: '32px 24px' } }}
      style={{ borderRadius: 16, overflow: 'hidden' }}
      destroyOnClose
    >
      {isSuccess ? (
        <Result
          icon={<CheckCircleFilled style={{ color: '#10B981', fontSize: 64 }} />}
          title={
            <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
              Giao dịch thành công!
            </Title>
          }
          subTitle={
            <div style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
                {formatCurrency(txData?.amount || 0)}
              </Text>
            </div>
          }
          style={{ padding: 0 }}
        >
          {/* Receipt Section */}
          <Card
            bordered={false}
            style={{
              background: '#f8fafc',
              borderRadius: 12,
              border: '1px dashed #e2e8f0',
              marginBottom: 24,
            }}
            styles={{ body: { padding: '16px' } }}
          >
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label={<Text type="secondary">Loại giao dịch</Text>}>
                <Text strong>{getTxTypeLabel(txData?.type)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Mã giao dịch</Text>}>
                <Text copyable={{ text: txData?.id }} style={{ fontFamily: 'monospace' }}>
                  {txData?.id ? `${txData.id.slice(0, 8)}...${txData.id.slice(-8)}` : 'N/A'}
                </Text>
              </Descriptions.Item>
              {txData?.fromAccount && (
                <Descriptions.Item label={<Text type="secondary">Từ tài khoản</Text>}>
                  <Text strong style={{ fontFamily: 'monospace' }}>{txData.fromAccount}</Text>
                </Descriptions.Item>
              )}
              {txData?.toAccount && (
                <Descriptions.Item label={<Text type="secondary">Đến tài khoản</Text>}>
                  <Text strong style={{ fontFamily: 'monospace' }}>{txData.toAccount}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label={<Text type="secondary">Nội dung</Text>}>
                {txData?.description || 'Không có lời nhắn'}
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Thời gian</Text>}>
                {txData?.createdAt ? new Date(txData.createdAt).toLocaleString('vi-VN') : 'Vừa xong'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button
              type="primary"
              icon={<HomeOutlined />}
              onClick={onClose}
              size="large"
              block
              style={{ background: '#0f172a', borderColor: '#0f172a', borderRadius: 8, height: 44 }}
            >
              Quay lại
            </Button>
          </Space>
        </Result>
      ) : (
        <Result
          status="error"
          icon={<CloseCircleFilled style={{ color: '#ef4444', fontSize: 64 }} />}
          title={
            <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
              Giao dịch thất bại!
            </Title>
          }
          subTitle={
            <Text type="secondary" style={{ fontSize: 14 }}>
              {errorMsg || 'Đã có lỗi xảy ra trong quá trình xử lý giao dịch. Vui lòng thử lại sau.'}
            </Text>
          }
          style={{ padding: 0 }}
        >
          <Space direction="vertical" style={{ width: '100%', marginTop: 12 }} size="middle">
            {onRetry && (
              <Button
                type="primary"
                icon={<RedoOutlined />}
                onClick={onRetry}
                size="large"
                block
                style={{ background: '#ef4444', borderColor: '#ef4444', borderRadius: 8, height: 44 }}
              >
                Thử lại giao dịch
              </Button>
            )}
            <Button
              type="default"
              onClick={onClose}
              size="large"
              block
              style={{ borderRadius: 8, height: 44, color: '#475569' }}
            >
              Hủy bỏ & Quay về
            </Button>
          </Space>
        </Result>
      )}
    </Modal>
  );
}
