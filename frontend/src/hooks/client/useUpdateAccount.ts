import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

interface UpdateAccountPayload {
  name?: string;
  theme?: string;
}

export function useUpdateAccount(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateAccountPayload) => {
      const { data } = await api.patch(`/accounts/${accountId}`, payload);
      return data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
