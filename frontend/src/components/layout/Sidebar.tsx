import { Layout, Typography, Space, Divider } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLogout } from '@/hooks/useAuth';
import {
  DashboardOutlined,
  CreditCardOutlined,
  SwapOutlined,
  HistoryOutlined,
  SettingOutlined,
  LogoutOutlined,
  BankOutlined
} from '@ant-design/icons';

const { Sider } = Layout;
const { Title } = Typography;

const navGroups = [
  {
    items: [
      { key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
      { key: '/accounts', label: 'Accounts', icon: <CreditCardOutlined /> },
      { key: '/transfer', label: 'Transfers', icon: <SwapOutlined /> },
    ]
  },
  {
    items: [
      { key: '/transactions', label: 'History & Analytics', icon: <HistoryOutlined /> },
    ]
  }
];

const bottomItems = [
  { key: '/settings', label: 'Settings & Security', icon: <SettingOutlined /> },
  { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, isDanger: true },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const logoutMutation = useLogout();

  return (
    <>
      <Sider
        width={260}
        theme="light"
        style={{
          background: '#fff',
          borderRight: '1px solid #e2e8f0',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Top Section */}
          <div style={{ padding: '24px' }}>
            <Space>
              <BankOutlined style={{ fontSize: 24, color: '#3B82F6' }} />
              <Title level={4} style={{ margin: 0, color: '#1e293b' }}>Simple Bank</Title>
            </Space>
          </div>

          {/* Navigation Groups */}
          <div className="sidebar-scrollable" style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
            {navGroups.map((group, idx) => (
              <div key={idx}>
                {group.items.map(item => {
                  const isActive = location.pathname === item.key;
                  return (
                    <div
                      key={item.key}
                      onClick={() => navigate(item.key)}
                      className={isActive ? 'sidebar-item active' : 'sidebar-item'}
                    >
                      <span style={{ fontSize: 18, display: 'flex' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom Settings & Logout */}
          <div style={{ padding: '0 12px 24px' }}>
            <Divider style={{ margin: '12px 0' }} />
            {bottomItems.map(item => {
              const isActive = location.pathname === item.key;
              const isDanger = item.isDanger;
              return (
                <div
                  key={item.key}
                  onClick={() => {
                    if (item.key === 'logout') logoutMutation.mutate();
                    else navigate(item.key);
                  }}
                  className={isDanger ? 'sidebar-item-danger' : (isActive ? 'sidebar-item active' : 'sidebar-item')}
                >
                  <span style={{ fontSize: 18, display: 'flex' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Sider>
    </>
  );
}
