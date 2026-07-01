import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

interface TransferPayload {
  from_accountId: string;
  to_accountNumber: string;
  amount: string;
  description?: string;
  idempotencyKey: string;
}

export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TransferPayload) => {
      const { data } = await api.post('/transactions/transfer', payload);
      return data;
    },
    onSuccess: () => {
      // Invalidate both accounts and transactions to refresh balance and history
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
