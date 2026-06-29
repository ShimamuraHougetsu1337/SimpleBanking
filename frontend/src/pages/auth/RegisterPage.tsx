import { useState } from 'react';
import { Form, Input, Button, message, Typography } from 'antd';
import { LockOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

const { Title } = Typography;

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
    <div className="auth-container">
      <div className="auth-card">
        <Title level={2} className="auth-title">
          Create Account
        </Title>
        <p className="auth-subtitle">Join us to start banking simply</p>

        <Form
          name="register"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="name"
            rules={[{ required: true, message: 'Please input your Name!' }]}
            className="auth-form-item"
          >
            <Input prefix={<UserOutlined />} placeholder="Full Name" />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your Email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
            className="auth-form-item"
          >
            <Input prefix={<MailOutlined />} placeholder="Email Address" />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
            className="auth-form-item"
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={['password']}
            hasFeedback
            className="auth-form-item"
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

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="auth-form-button"
              loading={loading}
              disabled={loading}
            >
              Sign Up
            </Button>
            <div className="auth-link">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
