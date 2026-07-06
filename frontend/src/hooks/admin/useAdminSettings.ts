import { useState } from 'react';
import { message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type SystemSetting } from '../../services/admin.service';

export function useAdminSettings() {
  const queryClient = useQueryClient();
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({});

  const { data: serverSettings = [], isLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: async () => {
      try {
        return await adminService.getSettings();
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        message.error('Không thể tải cấu hình hệ thống');
        throw error;
      }
    },
    retry: false,
  });

  // Calculate local settings using derived state to avoid cascading renders in useEffect
  const settings = serverSettings.map((s: SystemSetting) => {
    if (pendingUpdates[s.settingKey] !== undefined) {
      return { ...s, value: pendingUpdates[s.settingKey] };
    }
    return s;
  });

  const handleUpdateSetting = (key: string, value: any) => {
    setPendingUpdates(prev => ({ ...prev, [key]: value }));
  };

  const { mutate: handleSave, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (Object.keys(pendingUpdates).length === 0) {
        throw new Error('NO_CHANGES');
      }
      return await adminService.updateSettings(pendingUpdates);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['adminSettings'], data);
      setPendingUpdates({});
      message.success({
        content: 'Cấu hình hệ thống đã được cập nhật thành công.',
        style: { marginTop: '10vh' },
      });
    },
    onError: (error: any) => {
      if (error.message === 'NO_CHANGES') {
        message.info('Không có thay đổi nào để lưu');
      } else {
        console.error('Failed to update settings:', error);
        message.error('Có lỗi xảy ra khi lưu cấu hình');
      }
    },
  });

  return {
    settings,
    isLoading,
    isSaving,
    handleUpdateSetting,
    handleSave: () => handleSave(),
  };
}
