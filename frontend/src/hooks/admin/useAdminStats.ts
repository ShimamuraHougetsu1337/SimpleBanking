import { useState, useCallback, useEffect } from 'react';
import { adminService, type DashboardStats } from '@/services/admin.service';
import { message } from 'antd';

export function useAdminStats() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return { loading, stats, refetch: fetchStats };
}
