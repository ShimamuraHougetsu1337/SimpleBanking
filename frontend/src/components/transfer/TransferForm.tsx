import { Form, Input, Button, Card, Select } from 'antd';
import type { FormInstance } from 'antd';
import { useEffect } from 'react';

interface TransferFormProps {
  form: FormInstance<any>;
  accounts: any[] | undefined;
  isLoadingAccounts: boolean;
  onReview: (values: any) => void;
  isResolving: boolean;
}

export function TransferForm({ form, accounts, isLoadingAccounts, onReview, isResolving }: TransferFormProps) {

  // Pre-select the first account when accounts load
  useEffect(() => {
    if (accounts && accounts.length > 0 && !form.getFieldValue('from_accountId')) {
      form.setFieldsValue({ from_accountId: accounts[0].id });
    }
  }, [accounts, form]);

  const formatVND = (num: number | string) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num));

  return (
    <Card title="Chuyển tiền" bordered={false}>
      <Form form={form} layout="vertical" onFinish={onReview}>
        <Form.Item
          name="from_accountId"
          label="Tài khoản chuyển"
          rules={[{ required: true, message: 'Vui lòng chọn tài khoản nguồn' }]}
        >
          <Select
            size="large"
            loading={isLoadingAccounts}
            placeholder="Chọn tài khoản nguồn"
          >
            {accounts?.map((acc: any) => (
              <Select.Option key={acc.id} value={acc.id}>
                {acc.name} - {acc.accountNumber} ({formatVND(acc.balance)})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="to_accountNumber"
          label="Số tài khoản thụ hưởng"
          rules={[
            { required: true, message: 'Vui lòng nhập số tài khoản thụ hưởng' },
            { pattern: /^VN\d{14}$/, message: 'Số tài khoản phải bắt đầu bằng VN và tiếp theo là 14 chữ số' },
          ]}
        >
          <Input placeholder="VN17198234569999" size="large" />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Số tiền (VND)"
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền cần chuyển' },
            { pattern: /^\d+(\.\d{1,2})?$/, message: 'Định dạng số tiền không hợp lệ' },
            {
              validator: (_, value) => Number(value) > 0
                ? Promise.resolve()
                : Promise.reject('Số tiền phải lớn hơn 0')
            },
          ]}
        >
          <Input placeholder="500000" suffix="VND" size="large" />
        </Form.Item>

        <Form.Item name="description" label="Lời nhắn (Tùy chọn)">
          <Input.TextArea maxLength={255} showCount rows={3} placeholder="Ví dụ: Chuyển tiền ăn tối..." />
        </Form.Item>

        <Button type="primary" htmlType="submit" size="large" block loading={isResolving}>
          Tiếp tục
        </Button>
      </Form>
    </Card>
  );
}
