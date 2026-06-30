import { useState } from 'react';
import { message } from 'antd';

export interface AdminSettings {
  dailyLimit: string;
  transferFee: string;
  maintenanceMode: boolean;
  autoLockSuspicious: boolean;
}

const INITIAL_SETTINGS: AdminSettings = {
  dailyLimit: '50000000',
  transferFee: '2000',
  maintenanceMode: false,
  autoLockSuspicious: true,
};

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(INITIAL_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateSetting = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    message.success({
      content: 'System configurations updated successfully.',
      style: { marginTop: '10vh' },
    });
  };

  return {
    settings,
    isSaving,
    handleUpdateSetting,
    handleSave,
  };
}
