import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, Typography } from 'antd';
import type { AdminAccount } from '@/types/admin';

const { Text } = Typography;

interface AdminDepositModalProps {
  open: boolean;
  account: AdminAccount | null;
  onCancel: () => void;
  onDeposit: (accountId: string, amount: string, description?: string) => Promise<any> | void;
  isDepositing: boolean;
}

export const AdminDepositModal = ({
  open,
  account,
  onCancel,
  onDeposit,
  isDepositing,
}: AdminDepositModalProps) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ description: 'Nạp tiền từ Admin' });
    } else {
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = (values: any) => {
    if (account) {
      onDeposit(account.id, values.amount.toString(), values.description);
      onCancel();
    }
  };

  return (
    <Modal
      title={<span style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Nạp Tiền Vào Tài Khoản</span>}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={400}
    >
      <div style={{ marginBottom: 24 }}>
        <Text type="secondary">Đang nạp tiền vào tài khoản </Text>
        <Text strong>{account?.accountNumber}</Text>
        <Text type="secondary"> sở hữu bởi </Text>
        <Text strong>{account?.ownerName}</Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ description: 'Nạp tiền từ Admin' }}
      >
        <Form.Item
          name="amount"
          label="Số tiền (VND)"
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền nạp!' },
            { type: 'number', min: 1000, message: 'Số tiền nạp tối thiểu là 1,000 VND' },
          ]}
        >
          <InputNumber
            style={{ width: '100%', height: 40, borderRadius: 8 }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Mô tả"
        >
          <Input
            style={{ height: 40, borderRadius: 8 }}
            maxLength={100}
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          loading={isDepositing}
          style={{ height: 44, borderRadius: 8, marginTop: 16 }}
        >
          Xác nhận nạp tiền
        </Button>
      </Form>
    </Modal>
  );
};
