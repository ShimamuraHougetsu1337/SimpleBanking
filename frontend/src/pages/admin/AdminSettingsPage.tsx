import {
  Card,
  Typography,
  Space,
  Button,
  Input,
  Switch,
  Form,
  Divider,
} from 'antd';
import {
  SettingOutlined,
  DollarOutlined,
  SafetyOutlined,
  ToolOutlined,
  BarsOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useAdminSettings } from '@/hooks/admin/useAdminSettings';
import type { SystemSetting } from '@/types/admin';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/roles';
import { Navigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
  marginBottom: 24,
};

const GROUP_CONFIG: Record<string, { title: string; icon: React.ReactNode }> = {
  transaction: { title: 'Quy tắc giao dịch', icon: <DollarOutlined style={{ marginRight: 8, color: '#10B981' }} /> },
  security: { title: 'Chính sách bảo mật & tài khoản', icon: <SafetyOutlined style={{ marginRight: 8, color: '#EF4444' }} /> },
  system: { title: 'Trạng thái hệ thống', icon: <ToolOutlined style={{ marginRight: 8, color: '#F59E0B' }} /> },
  audit: { title: 'Lưu trữ nhật ký (Audit Logs)', icon: <DatabaseOutlined style={{ marginRight: 8, color: '#8B5CF6' }} /> },
};

export default function AdminSettingsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { settings, isSaving, handleUpdateSetting, handleSave } = useAdminSettings();

  if (currentUser?.role !== UserRole.SUPERADMIN) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  // Group settings
  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.groupName]) {
      acc[setting.groupName] = [];
    }
    acc[setting.groupName].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  // Sort each group's settings alphabetically by settingKey
  Object.values(groupedSettings).forEach((group) => {
    group.sort((a, b) => a.settingKey.localeCompare(b.settingKey));
  });

  const renderInput = (setting: SystemSetting) => {
    if (setting.dataType === 'boolean') {
      return (
        <Switch
          checked={Boolean(setting.value)}
          onChange={(checked) => handleUpdateSetting(setting.settingKey, checked)}
        />
      );
    }

    return (
      <Input
        value={setting.value}
        onChange={(e) => handleUpdateSetting(setting.settingKey, e.target.value)}
        style={{ borderRadius: 8, height: 40, maxWidth: 300 }}
      />
    );
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space size={12}>
          <SettingOutlined style={{ fontSize: 24, color: '#3B82F6' }} />
          <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Cài Đặt Hệ Thống</Title>
        </Space>
        <Button
          type="primary"
          onClick={handleSave}
          loading={isSaving}
          style={{ borderRadius: 8, height: 40, paddingInline: 24 }}
        >
          Lưu Thay Đổi
        </Button>
      </div>

      <Form layout="vertical">
        {Object.entries(groupedSettings).map(([groupName, groupSettings]) => {
          const config = GROUP_CONFIG[groupName] || { title: groupName, icon: <BarsOutlined style={{ marginRight: 8 }} /> };

          return (
            <Card
              key={groupName}
              style={CARD_SHADOW_STYLE}
              title={<span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{config.icon}{config.title}</span>}
            >
              {groupSettings.map((setting, index) => (
                <div key={setting.settingKey}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ paddingRight: 24 }}>
                      <Text strong style={{ color: '#1e293b', display: 'block', marginBottom: 4 }}>
                        {setting.displayName}
                      </Text>
                      <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, maxWidth: 450 }}>
                        {setting.description}
                      </Paragraph>
                    </div>
                    <div>
                      {renderInput(setting)}
                    </div>
                  </div>
                  {index < groupSettings.length - 1 && <Divider style={{ margin: '16px 0' }} />}
                </div>
              ))}
            </Card>
          );
        })}
      </Form>
    </div>
  );
}
