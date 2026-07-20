import { useState } from 'react';
import { message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { adminService } from '../../services/admin.service';
import type { SystemSetting } from '@/types/admin';

export function useAdminSettings() {
  const queryClient = useQueryClient();
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, unknown>>({});

  const { data: serverSettings = [], isLoading } = useQuery({
    queryKey: queryKeys.admin.settings.all,
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

  const handleUpdateSetting = (key: string, value: unknown) => {
    setPendingUpdates(prev => ({ ...prev, [key]: value }));
  };

  const { mutate: handleSave, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const keys = Object.keys(pendingUpdates);
      if (keys.length === 0) {
        throw new Error('NO_CHANGES');
      }

      for (const key of keys) {
        const setting = serverSettings.find((s: SystemSetting) => s.settingKey === key);
        if (setting) {
          const isNumeric = setting.groupName === 'transaction' || ['int', 'decimal', 'float'].includes(setting.dataType);
          if (isNumeric) {
            const val = pendingUpdates[key];
            const numVal = Number(val);
            if (val === '' || val === null || val === undefined || isNaN(numVal) || numVal < 0) {
              throw new Error(`INVALID_VALUE:${setting.displayName || setting.settingKey}`);
            }
          }
        }
      }

      return await adminService.updateSettings(pendingUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings.all });
      setPendingUpdates({});
      message.success({
        content: 'Cấu hình hệ thống đã được cập nhật thành công.',
        style: { marginTop: '10vh' },
      });
    },
    onError: (err: unknown) => {
      const error = err as { message?: string; response?: { data?: { message?: string | string[] } } };
      if (error.message === 'NO_CHANGES') {
        message.info('Không có thay đổi nào để lưu');
      } else if (typeof error.message === 'string' && error.message.startsWith('INVALID_VALUE:')) {
        const name = error.message.replace('INVALID_VALUE:', '');
        message.error(`Giá trị cho "${name}" phải là số lớn hơn hoặc bằng 0.`);
      } else {
        console.error('Failed to update settings:', err);
        const serverMsg = error?.response?.data?.message;
        const displayMsg = Array.isArray(serverMsg)
          ? serverMsg.join(', ')
          : serverMsg || 'Có lỗi xảy ra khi lưu cấu hình';
        message.error(displayMsg);
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
