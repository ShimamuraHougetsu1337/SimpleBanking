import { useState } from 'react';
import { Modal, Form, Input, Typography, Alert, Descriptions, Tag } from 'antd';
import { ExceptionOutlined } from '@ant-design/icons';
import { formatVnd } from '@/utils/format';
import type { AdminTransaction } from '@/types/admin';

const { Text } = Typography;
const { TextArea } = Input;

interface RequestReversalModalProps {
  open: boolean;
  transaction: AdminTransaction | null;
  onCancel: () => void;
  onConfirm: (transactionId: string, reason: string) => void;
  loading?: boolean;
}

export const RequestReversalModal = ({
  open,
  transaction,
  onCancel,
  onConfirm,
  loading = false,
}: RequestReversalModalProps) => {
  const [form] = Form.useForm<{ reason: string }>();
  const [reason, setReason] = useState('');

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (transaction) {
        onConfirm(transaction.id, values.reason);
        form.resetFields();
        setReason('');
      }
    } catch {
      // Validation errors handled by Form
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setReason('');
    onCancel();
  };

  if (!transaction) return null;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExceptionOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
            Tạo Yêu Cầu Hoàn Tiền
          </span>
        </div>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Tạo yêu cầu"
      cancelText="Hủy"
      okButtonProps={{
        danger: true,
        loading,
        disabled: reason.trim().length === 0,
        id: 'btn-confirm-request-reversal',
      }}
      cancelButtonProps={{ id: 'btn-cancel-request-reversal' }}
      width={560}
      styles={{ body: { paddingTop: 16 } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Alert
          type="warning"
          showIcon
          message="Lưu ý phong tỏa số dư"
          description={
            <span>
              Khi tạo yêu cầu này, số tiền&nbsp;
              <Text strong style={{ color: '#dc2626' }}>
                {formatVnd(transaction.amount)}
              </Text>
              &nbsp;sẽ bị <Text strong>phong tỏa tạm thời</Text> trên tài khoản người nhận cho đến khi Manager phê duyệt hoặc từ chối yêu cầu này.
            </span>
          }
        />

        <Descriptions
          column={1}
          size="small"
          bordered
          style={{ borderRadius: 8, overflow: 'hidden' }}
        >
          <Descriptions.Item label="Mã giao dịch">
            <Text copyable style={{ fontSize: 12, fontFamily: 'monospace' }}>
              {transaction.id}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Người gửi">
            <div>
              <Text strong>{transaction.fromUserName || '-'}</Text>
              {transaction.fromAccount && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  {transaction.fromAccount}
                </Text>
              )}
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="Người nhận">
            <div>
              <Text strong>{transaction.toUserName || '-'}</Text>
              {transaction.toAccount && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  {transaction.toAccount}
                </Text>
              )}
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="Số tiền cần hoàn">
            <Text strong style={{ color: '#dc2626', fontSize: 15 }}>
              {formatVnd(transaction.amount)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color="success">COMPLETED</Tag>
          </Descriptions.Item>
        </Descriptions>

        <Form form={form} layout="vertical" style={{ marginBottom: 0 }}>
          <Form.Item
            name="reason"
            label={<Text strong>Lý do khiếu nại / yêu cầu hoàn tiền</Text>}
            rules={[
              { required: true, message: 'Vui lòng nhập lý do' },
              { min: 10, message: 'Lý do phải có ít nhất 10 ký tự' },
              { max: 500, message: 'Lý do không được vượt quá 500 ký tự' },
            ]}
            style={{ marginBottom: 0 }}
          >
            <TextArea
              id="input-reversal-reason"
              rows={4}
              placeholder="Ví dụ: Khách hàng chuyển nhầm tài khoản. Giao dịch ngày 14/07/2026, số tiền 5,000,000đ..."
              maxLength={500}
              showCount
              onChange={(e) => setReason(e.target.value)}
              style={{ resize: 'none' }}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
