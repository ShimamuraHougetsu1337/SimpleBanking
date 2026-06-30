import { Layout, Avatar } from 'antd';
import { Outlet } from 'react-router-dom';
import { UserOutlined } from '@ant-design/icons';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/store/auth.store';

const { Header, Content } = Layout;

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />

      <Layout style={{ marginLeft: 260 }}>
        <Header style={{ background: '#fff', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '1px solid #e2e8f0', height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 8px', borderRadius: '8px' }}>
            <span style={{ fontWeight: 500, color: '#334155' }}>
              {user?.full_name || (user as any)?.fullName || 'User'}
            </span>
            <Avatar style={{ backgroundColor: '#3B82F6' }} icon={<UserOutlined />} />
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

