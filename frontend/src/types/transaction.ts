export const TransactionStatus = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  PENDING: 'pending',
  PENDING_OTP: 'pending_otp',
  PROCESSING: 'processing',
  REVERSED: 'reversed',
} as const;

export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];

export interface TransactionRecord {
  id: string;
  type: string;
  direction: 'credit' | 'debit';
  amount: string;
  fee?: string;
  totalAmount?: string;
  counterpartAccount?: string;
  counterpartName?: string;
  description?: string;
  status: TransactionStatus;
  createdAt: string;
}

export const STATUS_CONFIG: Record<TransactionStatus, { color: string; label: string }> = {
  [TransactionStatus.COMPLETED]: { color: 'green', label: 'Thành công' },
  [TransactionStatus.FAILED]: { color: 'red', label: 'Thất bại' },
  [TransactionStatus.PENDING]: { color: 'orange', label: 'Đang xử lý' },
  [TransactionStatus.PENDING_OTP]: { color: 'orange', label: 'Chờ OTP' },
  [TransactionStatus.PROCESSING]: { color: 'blue', label: 'Đang xử lý' },
  [TransactionStatus.REVERSED]: { color: 'purple', label: 'Đã hoàn tiền' },
};
