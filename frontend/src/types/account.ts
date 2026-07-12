import type { AdminAccount } from '@/types/admin';

export interface Account {
  id: string;
  accountNumber: string;
  name: string;
  balance: string;
  currency: string;
  theme?: string;
  status: string;
  createdAt: string;
  holdBalance?: string;
  dailyLimit?: string | null;
  usedDailyLimit?: string;
  user?: {
    fullName: string;
    email?: string;
  };
  [key: string]: unknown;
}

export interface CreateAccountPayload {
  name: string;
  theme: string;
}

export interface UpdateAccountPayload {
  name: string;
  theme: string;
}

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
