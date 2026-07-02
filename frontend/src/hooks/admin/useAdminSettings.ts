import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { adminService, type SystemSetting } from '../../services/admin.service';

export function useAdminSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({});

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getSettings();
      setSettings(data);
      setPendingUpdates({});
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      message.error('Không thể tải cấu hình hệ thống');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleUpdateSetting = (key: string, value: any) => {
    // Update local display immediately
    setSettings(prev => prev.map(s => s.settingKey === key ? { ...s, value } : s));
    // Queue for saving
    setPendingUpdates(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(pendingUpdates).length === 0) {
      message.info('Không có thay đổi nào để lưu');
      return;
    }

    try {
      setIsSaving(true);
      const data = await adminService.updateSettings(pendingUpdates);
      setSettings(data);
      setPendingUpdates({});
      message.success({
        content: 'Cấu hình hệ thống đã được cập nhật thành công.',
        style: { marginTop: '10vh' },
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
      message.error('Có lỗi xảy ra khi lưu cấu hình');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    handleUpdateSetting,
    handleSave,
  };
}
