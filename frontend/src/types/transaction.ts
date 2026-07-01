export interface TransactionRecord {
  id: string;
  type: string;
  direction: 'credit' | 'debit';
  amount: string;
  counterpartAccount?: string;
  counterpartName?: string;
  description?: string;
  status: string;
  createdAt: string;
}

export const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  completed: { color: 'green', label: 'Thành công' },
  success: { color: 'green', label: 'Thành công' },
  failed: { color: 'red', label: 'Thất bại' },
  pending: { color: 'orange', label: 'Đang xử lý' },
};
