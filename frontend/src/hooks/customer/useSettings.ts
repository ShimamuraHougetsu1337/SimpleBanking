import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import api from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/utils/error';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data;
    },
  });
}

export function useUpdateProfile() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { user, accessToken, setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (fullName: string) => {
      const { data } = await api.patch('/users/me/profile', { fullName });
      return data;
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
          },
          accessToken
        );
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });
}

export function useChangePassword() {
  const { message } = App.useApp();

  return useMutation({
    mutationFn: async (payload: Parameters<typeof api.patch>[1]) => {
      const { data } = await api.patch('/users/me/password', payload);
      return data;
    },
    onSuccess: () => {
      message.success('Đổi mật khẩu thành công!');
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });
}
