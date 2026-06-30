import { Modal, Form, InputNumber, Input } from 'antd';
import { useDeposit } from '@/hooks/useDeposit';
import { useWithdraw } from '@/hooks/useWithdraw';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
}

export function DepositModal({ isOpen, onClose, accountId }: ModalProps) {
  const [form] = Form.useForm();
  const { mutate: deposit, isPending } = useDeposit();

  const handleOk = () => {
    form.validateFields().then(values => {
      deposit(
        { accountId, amount: values.amount, description: values.description },
        {
          onSuccess: () => {
            form.resetFields();
            onClose();
          },
        }
      );
    });
  };

  return (
    <Modal
      title="Deposit Money"
      open={isOpen}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      confirmLoading={isPending}
      okText="Deposit"
      centered
    >
      <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
        <Form.Item
          name="amount"
          label="Amount (VND)"
          rules={[
            { required: true, message: 'Please enter amount' },
            { type: 'number', min: 1, message: 'Amount must be greater than 0' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            size="large"
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
            placeholder="0"
          />
        </Form.Item>
        <Form.Item name="description" label="Description (Optional)">
          <Input.TextArea placeholder="E.g., Salary, Gift..." rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function WithdrawModal({ isOpen, onClose, accountId }: ModalProps) {
  const [form] = Form.useForm();
  const { mutate: withdraw, isPending } = useWithdraw();

  const handleOk = () => {
    form.validateFields().then(values => {
      withdraw(
        { accountId, amount: values.amount, description: values.description },
        {
          onSuccess: () => {
            form.resetFields();
            onClose();
          },
        }
      );
    });
  };

  return (
    <Modal
      title="Withdraw Money"
      open={isOpen}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      confirmLoading={isPending}
      okText="Withdraw"
      okButtonProps={{ danger: true }}
      centered
    >
      <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
        <Form.Item
          name="amount"
          label="Amount (VND)"
          rules={[
            { required: true, message: 'Please enter amount' },
            { type: 'number', min: 1, message: 'Amount must be greater than 0' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            size="large"
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
            placeholder="0"
          />
        </Form.Item>
        <Form.Item name="description" label="Description (Optional)">
          <Input.TextArea placeholder="E.g., ATM Withdrawal..." rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
