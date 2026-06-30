import { useState } from 'react';
import { Form, Input, Button, message, Typography, Layout, Card } from 'antd';
import { LockOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Content } = Layout;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = (values: any) => {
    setLoading(true);
    
    // MOCK API REQUEST
    setTimeout(() => {
      console.log('Register values:', values);
      message.success('Registration successful! (Mocked)');
      setLoading(false);
      navigate('/login');
    }, 1000);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <Card bordered={false} style={{ borderRadius: 12, padding: '24px 12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Title level={2} style={{ margin: 0, color: '#1e293b' }}>
                Create Account
              </Title>
              <Text type="secondary" style={{ fontSize: 15 }}>Join us to start banking simply</Text>
            </div>

            <Form
              name="register"
              onFinish={onFinish}
              size="large"
              layout="vertical"
            >
              <Form.Item
                name="name"
                rules={[{ required: true, message: 'Please input your Name!' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Full Name" />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Please input your Email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Email Address" />
              </Form.Item>
              
              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Please input your Password!' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Password" />
              </Form.Item>

              <Form.Item
                name="confirm"
                dependencies={['password']}
                hasFeedback
                rules={[
                  {
                    required: true,
                    message: 'Please confirm your password!',
                  },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('The two passwords that you entered do not match!'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" />
              </Form.Item>

              <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={loading}
                  block
                  style={{ height: 44, fontWeight: 600 }}
                >
                  Sign Up
                </Button>
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <Text type="secondary">
                    Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
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
