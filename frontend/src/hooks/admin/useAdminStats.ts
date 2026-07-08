import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { adminService } from '@/services/admin.service';
import { message } from 'antd';

export function useAdminStats() {
  const { data: stats, isLoading: loading, refetch } = useQuery({
    queryKey: queryKeys.admin.stats.dashboard,
    queryFn: async () => {
      try {
        const data = await adminService.getDashboardStats();
        return data;
      } catch (error: any) {
        message.error(error.response?.data?.message || 'Failed to fetch dashboard stats');
        throw error;
      }
    },
    retry: false,
  });

  return { loading, stats: stats || null, refetch };
}
