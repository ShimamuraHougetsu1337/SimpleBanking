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
    <Card title="Transfer Money" bordered={false}>
      <Form form={form} layout="vertical" onFinish={onReview}>
        <Form.Item
          name="from_accountId"
          label="From Account"
          rules={[{ required: true, message: 'Please select an account to transfer from' }]}
        >
          <Select
            size="large"
            loading={isLoadingAccounts}
            placeholder="Select source account"
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
          label="Destination Account Number"
          rules={[
            { required: true, message: 'Please enter account number' },
            { pattern: /^VN\d{14}$/, message: 'Account number must be in format VN + 14 digits' },
          ]}
        >
          <Input placeholder="VN17198234569999" size="large" />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount (VND)"
          rules={[
            { required: true, message: 'Please input transfer amount' },
            { pattern: /^\d+(\.\d{1,2})?$/, message: 'Invalid decimal representation' },
            {
              validator: (_, value) => Number(value) > 0
                ? Promise.resolve()
                : Promise.reject('Amount must be greater than 0')
            },
          ]}
        >
          <Input placeholder="500000" suffix="VND" size="large" />
        </Form.Item>

        <Form.Item name="description" label="Message (Optional)">
          <Input.TextArea maxLength={255} showCount rows={3} placeholder="Dinner share..." />
        </Form.Item>

        <Button type="primary" htmlType="submit" size="large" block loading={isResolving}>
          Review Transfer
        </Button>
      </Form>
    </Card>
  );
}
