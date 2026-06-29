import { useState } from 'react';
import { Form, Input, Button, message, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

const { Title } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = (values: any) => {
    setLoading(true);
    
    // MOCK API REQUEST
    setTimeout(() => {
      console.log('Login values:', values);
      message.success('Login successful! (Mocked)');
      setLoading(false);
      navigate('/');
    }, 1000);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Title level={2} className="auth-title">
          Welcome Back
        </Title>
        <p className="auth-subtitle">Sign in to access your account</p>

        <Form
          name="normal_login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your Email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
            className="auth-form-item"
          >
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
            className="auth-form-item"
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="auth-form-button"
              loading={loading}
              disabled={loading}
            >
              Sign In
            </Button>
            <div className="auth-link">
              Don't have an account? <Link to="/register">Register now</Link>
            </div>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
