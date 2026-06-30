import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/utils/error';

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { message } = App.useApp();

  return useMutation({
    mutationFn: async (credentials: Parameters<typeof authService.login>) => {
      return await authService.login(credentials[0], credentials[1]);
    },
    onSuccess: (data) => {
      // data contains { accessToken, user }
      setAuth(data.user, data.accessToken);
      message.success('Login successful!');

      // Redirect based on role
      if (data.user.role === 'admin') {
        navigate('/admin/users');
      } else {
        navigate('/dashboard');
      }
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (credentials: Parameters<typeof authService.register>) =>
      authService.register(credentials[0], credentials[1], credentials[2]),
    onSuccess: () => {
      message.success('Registration successful! Please login to continue.');
      navigate('/login');
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.clear();
      message.success('Logged out successfully');
      navigate('/login');
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });
}
