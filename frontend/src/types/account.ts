import type { AdminAccount } from '@/services/admin.service';

export interface LimitModalProps {
  open: boolean;
  account: AdminAccount | null;
  onCancel: () => void;
  onUpdateLimit: (accountId: string, dailyLimit: string | null) => void;
  isUpdating: boolean;
}

export interface LimitFormValues {
  limitType: 'default' | 'custom';
  dailyLimit: number | null;
}
