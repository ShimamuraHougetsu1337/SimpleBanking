import { Layout, Menu, Typography, Avatar, Dropdown } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLogout } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import {
  TeamOutlined,
  TransactionOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const logoutMutation = useLogout();
  const user = useAuthStore((s) => s.user);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const menuItems = [
    {
      key: '/admin/users',
      icon: <TeamOutlined />,
      label: 'User Management',
    },
    {
      key: '/admin/transactions',
      icon: <TransactionOutlined />,
      label: 'All Transactions',
    },
    {
      key: '/admin/settings',
      icon: <SettingOutlined />,
      label: 'System Settings',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={250}
        theme="light"
        style={{
          background: '#fff',
          borderRight: '1px solid #e2e8f0',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
            <SafetyCertificateOutlined />
          </div>
          <Title level={4} style={{ margin: 0, color: '#1e293b' }}>Admin Panel</Title>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, padding: '0 12px' }}
          theme="light"
        />

      </Sider>

      <Layout style={{ marginLeft: 250 }}>
        <Header style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '1px solid #e2e8f0', height: 72 }}>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Logout',
                  onClick: handleLogout,
                  danger: true,
                },
              ],
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background 0.3s' }} className="user-dropdown-trigger">
              <span style={{ fontWeight: 500, color: '#334155' }}>
                {user?.full_name || (user as any)?.fullName || 'Super Admin'}
              </span>
              <Avatar style={{ backgroundColor: '#10B981' }} icon={<UserOutlined />} />
            </div>
          </Dropdown>
        </Header>
        <Content style={{ padding: '32px', background: '#F8FAFC' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
