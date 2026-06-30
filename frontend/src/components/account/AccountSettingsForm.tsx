import { Form, Row, Col, Input, Select, Button, Card, message } from 'antd';
import { useUpdateAccount } from '@/hooks/useUpdateAccount';

const AVAILABLE_THEMES = [
  { label: 'Default Black Metallic', value: 'linear-gradient(135deg, #111827 0%, #000000 100%)' },
  { label: 'Ocean Blue', value: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)' },
  { label: 'Emerald Green', value: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)' },
  { label: 'Royal Purple', value: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)' },
];

interface AccountSettingsFormProps {
  accountId: string;
  initialValues: { name: string; theme: string };
  onSuccess: () => void;
}

export function AccountSettingsForm({ accountId, initialValues, onSuccess }: AccountSettingsFormProps) {
  const [form] = Form.useForm();
  const updateAccount = useUpdateAccount(accountId);

  const handleUpdateSettings = (values: any) => {
    updateAccount.mutate(values, {
      onSuccess: () => {
        message.success('Account settings updated successfully');
        onSuccess();
      },
      onError: () => {
        message.error('Failed to update account settings');
      }
    });
  };

  return (
    <Card title="Account Settings" bordered={false} style={{ marginBottom: 24 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleUpdateSettings}
        initialValues={initialValues}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="name"
              label="Account Name"
              rules={[{ required: true, message: 'Please enter account name' }]}
            >
              <Input placeholder="E.g., Savings Account" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="theme"
              label="Card Theme"
              rules={[{ required: true, message: 'Please select a theme' }]}
            >
              <Select>
                {AVAILABLE_THEMES.map(theme => (
                  <Select.Option key={theme.value} value={theme.value}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 16, height: 16, background: theme.value, borderRadius: 4 }}></div>
                      {theme.label}
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={updateAccount.isPending}>
            Save Settings
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
