import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import api from '../../services/api';

interface CreateAccountPayload {
  name: string;
  theme?: string;
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAccountPayload) => {
      const { data } = await api.post('/accounts', payload);
      return data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh list
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}
