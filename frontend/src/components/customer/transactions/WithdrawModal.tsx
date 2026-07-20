import { useState } from 'react';
import { Modal, Form, InputNumber, Input, message } from 'antd';
import { useWithdraw } from '@/hooks/customer/useWithdraw';
import { useAuthStore } from '@/store/auth.store';
import { v4 as uuidv4 } from 'uuid';
import { getErrorMessage } from '@/utils/error';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onSuccess?: (tx: unknown) => void;
}

export function WithdrawModal({ isOpen, onClose, accountId, onSuccess }: ModalProps) {
  const [form] = Form.useForm();
  const { mutate: withdraw, isPending } = useWithdraw();
  const user = useAuthStore(s => s.user);
  const defaultDescription = user?.full_name ? `${user.full_name} rút tiền ra khỏi tài khoản` : 'Rút tiền ra khỏi tài khoản';
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => uuidv4());

  const handleClose = () => {
    form.resetFields();
    setIdempotencyKey(uuidv4());
    onClose();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const description = values.description?.trim() || defaultDescription;
      withdraw(
        { accountId, amount: values.amount, description, idempotencyKey },
        {
          onSuccess: (data) => {
            message.success('Rút tiền từ tài khoản thành công!');
            handleClose();
            onSuccess?.(data);
          },
          onError: (err: unknown) => {
            const errorMsg = getErrorMessage(err);
            message.error(errorMsg);
          }
        }
      );
    } catch {
      // Form validation failed, UI will show warnings automatically
    }
  };

  // Pre-fill the form description when opened/reset
  const initialValues = {
    description: defaultDescription,
  };

  return (
    <Modal
      title="Rút tiền"
      open={isOpen}
      onOk={handleOk}
      onCancel={handleClose}
      confirmLoading={isPending}
      okText="Rút tiền"
      okButtonProps={{ danger: true }}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 24 }}
        initialValues={initialValues}
      >
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
        <Form.Item name="description" label="Mô tả (Mặc định tự động điền)">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
