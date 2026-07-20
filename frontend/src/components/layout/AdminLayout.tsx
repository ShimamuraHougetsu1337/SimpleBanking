import { Layout, Typography, Avatar, Divider, Space } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLogout } from '@/hooks/customer/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/roles';
import {
  TeamOutlined,
  TransactionOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
  BankOutlined,
  DatabaseOutlined,
  AuditOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const getNavGroups = (role?: string) => {
  const items = [
    { key: '/admin/dashboard', label: 'Bảng điều khiển', icon: <DashboardOutlined /> },
    { key: '/admin/users', label: 'Quản lý người dùng', icon: <TeamOutlined /> },
    { key: '/admin/accounts', label: 'Quản lý tài khoản', icon: <BankOutlined /> },
    { key: '/admin/transactions', label: 'Lịch sử giao dịch', icon: <TransactionOutlined /> },
    { key: '/admin/transaction-requests', label: 'Yêu cầu giao dịch', icon: <TransactionOutlined /> },
    { key: '/admin/fraud-flags', label: 'Cảnh báo gian lận', icon: <WarningOutlined /> },
  ];

  if (role === UserRole.SUPERADMIN || role === UserRole.MANAGER) {
    items.push({ key: '/admin/reconciliation', label: 'Đối soát số dư', icon: <AuditOutlined /> });
    items.push({ key: '/admin/audit-logs', label: 'Nhật ký hệ thống', icon: <DatabaseOutlined /> });
  }

  return [{ items }];
};

const getBottomItems = (role?: string) => {
  const items = [];
  if (role === UserRole.SUPERADMIN) {
    items.push({ key: '/admin/settings', label: 'Cài đặt hệ thống', icon: <SettingOutlined /> });
  }
  items.push({ key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined />, isDanger: true });
  return items;
};

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const logoutMutation = useLogout();
  const user = useAuthStore((s) => s.user);

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
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Top Section */}
          <div style={{ padding: '24px' }}>
            <Space>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                <SafetyCertificateOutlined />
              </div>
              <Title level={4} style={{ margin: 0, color: '#1e293b' }}>Trang quản trị</Title>
            </Space>
          </div>

          {/* Navigation Groups */}
          <div className="sidebar-scrollable" style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
            {getNavGroups(user?.role).map((group, idx) => (
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
            {getBottomItems(user?.role).map(item => {
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

      <Layout style={{ marginLeft: 250 }}>
        <Header style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '1px solid #e2e8f0', height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 8px', borderRadius: '8px' }}>
            <span style={{ fontWeight: 500, color: '#334155' }}>
              {user?.full_name || (user as any)?.fullName || 'Quản trị viên cấp cao'}
            </span>
            <Avatar style={{ backgroundColor: '#10B981' }} icon={<UserOutlined />} />
          </div>
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
