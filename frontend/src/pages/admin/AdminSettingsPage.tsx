import {
  Card,
  Typography,
  Space,
  Button,
  Input,
  Switch,
  Row,
  Col,
  Form,
  Divider,
} from 'antd';
import {
  SettingOutlined,
  DollarOutlined,
  SafetyOutlined,
  ToolOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useAdminSettings } from '@/hooks/admin/useAdminSettings';

const { Title, Text, Paragraph } = Typography;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
  marginBottom: 24,
};

export default function AdminSettingsPage() {
  const { settings, isSaving, handleUpdateSetting, handleSave } = useAdminSettings();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space size={12}>
          <SettingOutlined style={{ fontSize: 24, color: '#3B82F6' }} />
          <Title level={2} style={{ margin: 0, color: '#1e293b' }}>System Settings</Title>
        </Space>
        <Button
          type="primary"
          onClick={handleSave}
          loading={isSaving}
          style={{ borderRadius: 8, height: 40, paddingInline: 24 }}
        >
          Save Changes
        </Button>
      </div>

      <Form layout="vertical">
        {/* Transaction Limits & Fees */}
        <Card style={CARD_SHADOW_STYLE} title={<span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}><DollarOutlined style={{ marginRight: 8, color: '#10B981' }} />Transaction Rules</span>}>
          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<span style={{ fontWeight: 500, color: '#475569' }}>Daily Limit (VND)</span>}
                help="Maximum aggregate transfer amount allowed per user per day."
              >
                <Input
                  prefix={<span style={{ color: '#94a3b8' }}>₫</span>}
                  value={settings.dailyLimit}
                  onChange={(e) => handleUpdateSetting('dailyLimit', e.target.value)}
                  style={{ borderRadius: 8, height: 40 }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<span style={{ fontWeight: 500, color: '#475569' }}>Standard Transfer Fee (VND)</span>}
                help="Flat charge deducted automatically on domestic bank transfers."
              >
                <Input
                  prefix={<span style={{ color: '#94a3b8' }}>₫</span>}
                  value={settings.transferFee}
                  onChange={(e) => handleUpdateSetting('transferFee', e.target.value)}
                  style={{ borderRadius: 8, height: 40 }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Security & Access Policies */}
        <Card style={CARD_SHADOW_STYLE} title={<span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}><SafetyOutlined style={{ marginRight: 8, color: '#EF4444' }} />Security & Accounts Policies</span>}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <Text strong style={{ color: '#1e293b', display: 'block' }}>Auto-Lock Suspicious Accounts</Text>
              <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, maxWidth: 450 }}>
                Automatically lock customer profiles when refresh token reuse is detected or multiple rapid failed transactions are recorded.
              </Paragraph>
            </div>
            <Switch
              checked={settings.autoLockSuspicious}
              onChange={(checked) => handleUpdateSetting('autoLockSuspicious', checked)}
            />
          </div>
          <Divider style={{ margin: '16px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Text strong style={{ color: '#1e293b', display: 'block' }}><LockOutlined style={{ marginRight: 6 }} />Enforce Two-Factor Authentication (2FA)</Text>
              <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, maxWidth: 450 }}>
                Require admins and high-volume customers to register Google Authenticator or Email OTP code before execution.
              </Paragraph>
            </div>
            <Switch disabled checked={true} />
          </div>
        </Card>

        {/* System Operations & Maintenance */}
        <Card style={CARD_SHADOW_STYLE} title={<span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}><ToolOutlined style={{ marginRight: 8, color: '#F59E0B' }} />System State</span>}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Text strong style={{ color: '#1e293b', display: 'block' }}>System Maintenance Mode</Text>
              <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, maxWidth: 450 }}>
                Puts the entire application into maintenance. Customers will not be able to log in or initiate transactions. Admins retain full access.
              </Paragraph>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onChange={(checked) => handleUpdateSetting('maintenanceMode', checked)}
            />
          </div>
        </Card>
      </Form>
    </div>
  );
}
