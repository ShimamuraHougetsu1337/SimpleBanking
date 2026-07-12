import { Spin } from 'antd';
import { useAdminStats } from '@/hooks/admin/useAdminStats';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/roles';
import type { DashboardStats } from '@/services/admin.service';
import ManagerDashboard from '@/components/admin/dashboard/ManagerDashboard';
import TellerDashboard from '@/components/admin/dashboard/TellerDashboard';
import SystemDashboard from '@/components/admin/dashboard/SystemDashboard';
import type { ComponentType } from 'react';

const DASHBOARD_MAP: Record<string, ComponentType<{ stats: DashboardStats }>> = {
  [UserRole.MANAGER]: ManagerDashboard,
  [UserRole.TELLER]: TellerDashboard,
};

export default function AdminDashboardPage() {
  const { stats, loading } = useAdminStats();
  const currentUser = useAuthStore((s) => s.user);

  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  const TargetDashboard = DASHBOARD_MAP[currentUser?.role || ''] || SystemDashboard;

  return <TargetDashboard stats={stats} />;
}
