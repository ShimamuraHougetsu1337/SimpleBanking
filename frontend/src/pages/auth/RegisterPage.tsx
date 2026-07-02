import { Form, Input, Button, Typography, Layout, Card } from 'antd';
import { LockOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useRegister } from '@/hooks/customer/useAuth';

const { Title, Text } = Typography;
const { Content } = Layout;

export default function RegisterPage() {
  const registerMutation = useRegister();

  const onFinish = (values: any) => {
    registerMutation.mutate([values.fullName, values.email, values.password]);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <Card variant="borderless" style={{ borderRadius: 12, padding: '24px 12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Title level={2} style={{ margin: 0, color: '#1e293b' }}>
                Tạo Tài Khoản
              </Title>
              <Text type="secondary" style={{ fontSize: 15 }}>Tham gia cùng chúng tôi để bắt đầu giao dịch ngân hàng dễ dàng</Text>
            </div>

            <Form
              name="register"
              onFinish={onFinish}
              size="large"
              layout="vertical"
              validateTrigger="onSubmit"
            >
              <Form.Item
                name="fullName"
                rules={[
                  { required: true, message: 'Vui lòng nhập Họ và tên!' },
                  { min: 2, message: 'Họ và tên phải có ít nhất 2 ký tự' }
                ]}
              >
                <Input prefix={<UserOutlined />} placeholder="Họ và tên" />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập Email!' },
                  { type: 'email', message: 'Vui lòng nhập địa chỉ Email hợp lệ!' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Địa chỉ Email" />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: 'Vui lòng nhập Mật khẩu!' },
                  { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/, message: 'Mật khẩu phải có ít nhất 6 ký tự và chứa chữ hoa, chữ thường, chữ số, ký tự đặc biệt' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
              </Form.Item>

              <Form.Item
                name="confirm"
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng xác nhận mật khẩu!',
                  },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Hai mật khẩu bạn đã nhập không khớp!'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" />
              </Form.Item>

              <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={registerMutation.isPending}
                  disabled={registerMutation.isPending}
                  block
                  style={{ height: 44, fontWeight: 600 }}
                >
                  Đăng Ký
                </Button>
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <Text type="secondary">
                    Đã có tài khoản? <Link to="/login" style={{ fontWeight: 600 }}>Đăng nhập</Link>
                  </Text>
                </div>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </Content>
    </Layout>
  );
}
