import { Form, Input, Button, Typography } from 'antd';
import { useChangePassword } from '@/hooks/customer/useSettings';

const { Text } = Typography;

export default function ChangePasswordForm() {
  const changePasswordMutation = useChangePassword();
  const [securityForm] = Form.useForm();

  const handleChangePassword = (values: Record<string, string>) => {
    changePasswordMutation.mutate(
      {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          securityForm.resetFields();
        },
      }
    );
  };

  return (
    <Form
      form={securityForm}
      layout="vertical"
      onFinish={handleChangePassword}
      requiredMark={false}
      validateTrigger="onSubmit"
    >
      <Form.Item
        label={<Text style={{ fontWeight: 500, color: '#475569' }}>Mật khẩu hiện tại</Text>}
        name="oldPassword"
        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
      >
        <Input.Password size="large" placeholder="Nhập mật khẩu hiện tại" />
      </Form.Item>

      <Form.Item
        label={<Text style={{ fontWeight: 500, color: '#475569' }}>Mật khẩu mới</Text>}
        name="newPassword"
        rules={[
          { required: true, message: 'Vui lòng nhập mật khẩu mới' },
          { min: 6, message: 'Mật khẩu phải chứa ít nhất 6 ký tự' },
          { max: 128, message: 'Mật khẩu không dài quá 128 ký tự' },
          {
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/,
            message: 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt',
          },
        ]}
      >
        <Input.Password size="large" placeholder="Nhập mật khẩu mới" />
      </Form.Item>

      <Form.Item
        label={<Text style={{ fontWeight: 500, color: '#475569' }}>Xác nhận mật khẩu mới</Text>}
        name="confirmPassword"
        dependencies={['newPassword']}
        rules={[
          { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('newPassword') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
            },
          }),
        ]}
      >
        <Input.Password size="large" placeholder="Nhập lại mật khẩu mới" />
      </Form.Item>

      <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={changePasswordMutation.isPending}
          style={{
            background: '#3B82F6',
            borderColor: '#3B82F6',
            height: 44,
            padding: '0 24px',
            borderRadius: 6,
            fontWeight: 500,
          }}
        >
          Đổi mật khẩu
        </Button>
      </Form.Item>
    </Form>
  );
}
