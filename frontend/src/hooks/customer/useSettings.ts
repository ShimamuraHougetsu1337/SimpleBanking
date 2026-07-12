import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { App } from 'antd';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/utils/error';

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.settings.profile,
    queryFn: async () => {
      return await authService.getCurrentUser();
    },
  });
}

export function useUpdateProfile() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { user, accessToken, setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async ({ fullName, phoneNumber }: { fullName: string; phoneNumber?: string }) => {
      return await authService.updateProfile(fullName, phoneNumber);
    },
    onSuccess: (updatedUser) => {
      message.success('Cập nhật thông tin thành công!');
      // Update local auth store so layout headers update immediately
      if (user && accessToken) {
        setAuth(
          {
            ...user,
            fullName: updatedUser.fullName,
            full_name: updatedUser.fullName, // Keep compatibility for both formats
            phoneNumber: updatedUser.phoneNumber,
          },
          accessToken
        );
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile });
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });
}

export function useChangePassword() {
  const { message } = App.useApp();

  return useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      return await authService.changePassword(payload);
    },
    onSuccess: () => {
      message.success('Đổi mật khẩu thành công!');
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });
}
