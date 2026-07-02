import { useEffect, useState } from 'react';
import { Form, Input, Button, Typography, Layout, Card, Alert } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { useLogin } from '@/hooks/customer/useAuth';

const { Title, Text } = Typography;
const { Content } = Layout;

export default function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionExpired, setSessionExpired] = useState(false);
  const loginMutation = useLogin();

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setSessionExpired(true);
      // Clean up the URL parameter without triggering a reload
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const onFinish = (values: any) => {
    loginMutation.mutate([values.email, values.password]);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <Card variant="borderless" style={{ borderRadius: 12, padding: '24px 12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Title level={2} style={{ margin: 0, color: '#1e293b' }}>
                Chào Mừng Trở Lại
              </Title>
              <Text type="secondary" style={{ fontSize: 15 }}>Đăng nhập để truy cập tài khoản của bạn</Text>
            </div>

            {sessionExpired && (
              <Alert
                message="Phiên đăng nhập đã hết hạn vì lý do bảo mật. Vui lòng đăng nhập lại."
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            <Form
              name="normal_login"
              onFinish={onFinish}
              size="large"
              layout="vertical"
              validateTrigger="onSubmit"
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập Email!' },
                  { type: 'email', message: 'Vui lòng nhập địa chỉ Email hợp lệ!' }
                ]}
              >
                <Input prefix={<UserOutlined />} placeholder="Email" />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
              </Form.Item>

              <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loginMutation.isPending}
                  disabled={loginMutation.isPending}
                  block
                  style={{ height: 44, fontWeight: 600 }}
                >
                  Đăng Nhập
                </Button>
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <Text type="secondary">
                    Chưa có tài khoản? <Link to="/register" style={{ fontWeight: 600 }}>Đăng ký ngay</Link>
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
