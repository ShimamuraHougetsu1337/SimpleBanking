import { useState } from 'react';
import { Card, Typography, Tabs } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import ProfileForm from '@/components/customer/settings/ProfileForm';
import ChangePasswordForm from '@/components/customer/settings/ChangePasswordForm';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

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
          <ProfileForm />
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
          <ChangePasswordForm />
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
