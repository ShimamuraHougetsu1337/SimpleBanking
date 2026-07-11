import { Modal, Form, InputNumber, Input, message } from 'antd';
import { useDeposit } from '@/hooks/customer/useDeposit';
import { v4 as uuidv4 } from 'uuid';
import { getErrorMessage } from '@/utils/error';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onSuccess?: (tx: unknown) => void;
}

export function DepositModal({ isOpen, onClose, accountId, onSuccess }: ModalProps) {
  const [form] = Form.useForm();
  const { mutate: deposit, isPending } = useDeposit();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      deposit(
        { accountId, amount: values.amount, description: values.description, idempotencyKey: uuidv4() },
        {
          onSuccess: (data) => {
            message.success('Nạp tiền vào tài khoản thành công!');
            form.resetFields();
            onClose();
            onSuccess?.(data);
          },
          onError: (err: unknown) => {
            const errorMsg = getErrorMessage(err);
            message.error(errorMsg);
          }
        }
      );
    } catch {
      // Form validation failed
    }
  };

  return (
    <Modal
      title="Nạp tiền"
      open={isOpen}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      confirmLoading={isPending}
      okText="Nạp tiền"
      centered
    >
      <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
        <Form.Item
          name="amount"
          label="Số tiền (VND)"
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền' },
            { type: 'number', min: 1, message: 'Số tiền phải lớn hơn 0' }
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
        <Form.Item name="description" label="Mô tả (Tùy chọn)">
          <Input.TextArea placeholder="Ví dụ: Lương, Quà tặng..." rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
