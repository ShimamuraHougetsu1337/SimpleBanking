import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, Typography } from 'antd';
import type { AdminAccount } from '@/services/admin.service';

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
      form.setFieldsValue({ description: 'Admin Deposit' });
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
      title={<span style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Deposit to Account</span>}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={400}
    >
      <div style={{ marginBottom: 24 }}>
        <Text type="secondary">Depositing to account </Text>
        <Text strong>{account?.accountNumber}</Text>
        <Text type="secondary"> owned by </Text>
        <Text strong>{account?.ownerName}</Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ description: 'Admin Deposit' }}
      >
        <Form.Item
          name="amount"
          label="Amount (VND)"
          rules={[
            { required: true, message: 'Please input deposit amount!' },
            { type: 'number', min: 1000, message: 'Minimum deposit is 1,000 VND' },
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
          label="Description"
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
          Confirm Deposit
        </Button>
      </Form>
    </Modal>
  );
};
