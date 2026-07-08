import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { App } from 'antd';
import { adminService } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/error';

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: adminService.createUser,
    onSuccess: () => {
      message.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats.dashboard });
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });
}
