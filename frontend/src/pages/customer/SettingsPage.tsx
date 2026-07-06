import { useState, useEffect } from 'react';
import { Card, Typography, Tabs, Form, Input, Button, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useProfile, useUpdateProfile, useChangePassword } from '@/hooks/customer/useSettings';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const { data: profile, isLoading } = useProfile();

  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  const [profileForm] = Form.useForm();
  const [securityForm] = Form.useForm();

  // Pre-fill profile form when data loads
  useEffect(() => {
    if (profile) {
      profileForm.setFieldsValue({
        fullName: profile.fullName || profile.full_name,
        email: profile.email,
      });
    }
  }, [profile, profileForm]);

  const handleUpdateProfile = (values: { fullName: string }) => {
    updateProfileMutation.mutate(values.fullName);
  };

  const handleChangePassword = (values: any) => {
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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const items = [
    {
      key: 'profile',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <UserOutlined />
          Thông tin cá nhân
        </span>
      ),
      children: (
        <div style={{ padding: '12px 0' }}>
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleUpdateProfile}
            requiredMark={false}
            validateTrigger="onSubmit"
          >
            <Form.Item
              label={<Text style={{ fontWeight: 500, color: '#475569' }}>Địa chỉ Email</Text>}
              name="email"
            >
              <Input disabled size="large" style={{ background: '#f8fafc', color: '#64748b' }} />
            </Form.Item>

            <Form.Item
              label={<Text style={{ fontWeight: 500, color: '#475569' }}>Họ và tên</Text>}
              name="fullName"
              rules={[
                { required: true, message: 'Vui lòng nhập họ và tên' },
                { min: 2, message: 'Họ và tên phải từ 2 ký tự trở lên' },
                { max: 100, message: 'Họ và tên không được vượt quá 100 ký tự' },
              ]}
            >
              <Input size="large" placeholder="Nhập họ và tên của bạn" />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={updateProfileMutation.isPending}
                style={{
                  background: '#3B82F6',
                  borderColor: '#3B82F6',
                  height: 44,
                  padding: '0 24px',
                  borderRadius: 6,
                  fontWeight: 500,
                }}
              >
                Lưu thay đổi
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'security',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <LockOutlined />
          Bảo mật & Mật khẩu
        </span>
      ),
      children: (
        <div style={{ padding: '12px 0' }}>
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
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Cài đặt & Bảo mật</Title>
        <Text style={{ color: '#64748b', fontSize: 14 }}>
          Cập nhật thông tin cá nhân và thiết lập mật khẩu bảo vệ tài khoản
        </Text>
      </div>

      <Card variant="borderless" styles={{ body: { padding: '24px 32px' } }} style={{ borderRadius: 12 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
          tabBarStyle={{ marginBottom: 24 }}
          className="settings-tabs"
        />
      </Card>

      <style>{`
        .settings-tabs .ant-tabs-nav::before {
          border-bottom: 1px solid #f1f5f9;
        }
        .settings-tabs .ant-tabs-tab {
          padding: 12px 4px !important;
          margin-right: 32px !important;
        }
        .settings-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #3B82F6 !important;
          font-weight: 500;
        }
        .settings-tabs .ant-tabs-ink-bar {
          background: #3B82F6 !important;
          height: 2px !important;
        }
        .ant-form-item-label > label {
          font-size: 13px !important;
        }
      `}</style>
    </div>
  );
}
