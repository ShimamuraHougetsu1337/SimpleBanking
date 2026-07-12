import { Form } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { adminService } from '@/services/admin.service';
import { DEFAULT_SYSTEM_LIMIT } from '@/constants/limits';
import type { LimitModalProps, LimitFormValues } from '@/types/account';

export function useLimitModal({ open, account, onCancel, onUpdateLimit }: Omit<LimitModalProps, 'isUpdating'>) {
  const [form] = Form.useForm();

  const { data: settings } = useQuery({
    queryKey: queryKeys.admin.settings.all,
    queryFn: adminService.getSettings,
    enabled: open,
  });

  const systemLimitSetting = settings?.find((s) => s.settingKey === 'daily_limit');
  const systemLimit = systemLimitSetting ? Number(systemLimitSetting.value) : DEFAULT_SYSTEM_LIMIT;

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleFinish = (values: LimitFormValues) => {
    if (!account) return;
    const finalLimit = values.limitType === 'default' ? null : (values.dailyLimit ? values.dailyLimit.toString() : null);
    onUpdateLimit(account.id, finalLimit);
    form.resetFields();
    onCancel();
  };

  return {
    form,
    systemLimit,
    handleCancel,
    handleFinish,
  };
}
