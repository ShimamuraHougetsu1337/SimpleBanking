import { useEffect, useRef, useState } from 'react';
import { Form, Input, Button, Typography, Layout, Card, Alert } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useLogin } from '@/hooks/customer/useAuth';
import { useAuthStore } from '@/store/auth.store';
import axios from 'axios';

const { Title, Text } = Typography;
const { Content } = Layout;

export default function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loginMutation = useLogin();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const isAdmin = useAuthStore((s) => s.isAdmin());

  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setSessionExpired(true);
      // Clean up the URL parameter without triggering a reload
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Handle rate limit error — start countdown
  useEffect(() => {
    const error = loginMutation.error;
    if (!error) return;

    if (axios.isAxiosError(error) && error.response?.status === 429) {
      // Ưu tiên đọc từ Header chuẩn HTTP 'Retry-After', nếu không có thì đọc từ JSON, cuối cùng fallback về 60
      const headerRetry = error.response.headers?.['retry-after'];
      const jsonRetry = (error.response.data as { retryAfter?: number })?.retryAfter;
      const retryAfter: number = headerRetry ? parseInt(headerRetry as string, 10) : (jsonRetry ?? 60);
      setRateLimitSeconds(retryAfter);

      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setRateLimitSeconds((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [loginMutation.error]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const isRateLimited = rateLimitSeconds > 0;

  const onFinish = (values: { email: string; password: string }) => {
    if (isRateLimited) return;
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

            {isRateLimited && (
              <Alert
                message={`Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ${rateLimitSeconds} giây.`}
                type="error"
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
                  disabled={loginMutation.isPending || isRateLimited}
                  block
                  style={{ height: 44, fontWeight: 600 }}
                >
                  {isRateLimited ? `Thử lại sau ${rateLimitSeconds}s` : 'Đăng Nhập'}
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
