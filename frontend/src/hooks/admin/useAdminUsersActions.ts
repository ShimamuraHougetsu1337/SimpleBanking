import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { adminService } from '@/services/admin.service';
import { message } from 'antd';

export function useAdminUsersActions() {
  const queryClient = useQueryClient();

  const lockMutation = useMutation({
    mutationFn: (userId: string) => adminService.updateUserStatus(userId, 'locked'),
    onSuccess: () => {
      message.success('User locked successfully');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to lock user';
      message.error(errMsg);
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (userId: string) => adminService.updateUserStatus(userId, 'active'),
    onSuccess: () => {
      message.success('User unlocked successfully');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to unlock user';
      message.error(errMsg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminService.softDeleteUser(userId),
    onSuccess: () => {
      message.success('User soft deleted successfully');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete user';
      message.error(errMsg);
    },
  });

  const reactivateOtpMutation = useMutation({
    mutationFn: (userId: string) => adminService.reactivateOtp(userId),
    onSuccess: () => {
      message.success('Mở khóa OTP thành công');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Không thể kích hoạt lại OTP';
      message.error(errMsg);
    },
  });

  const handleLockUser = (userId: string) => {
    lockMutation.mutate(userId);
  };

  const handleUnlockUser = (userId: string) => {
    unlockMutation.mutate(userId);
  };

  const handleDeleteUser = (userId: string) => {
    deleteMutation.mutate(userId);
  };

  const handleReactivateOtp = (userId: string) => {
    reactivateOtpMutation.mutate(userId);
  };

  return {
    handleLockUser,
    handleUnlockUser,
    handleDeleteUser,
    handleReactivateOtp,
    isReactivatingOtp: reactivateOtpMutation.isPending,
  };
}
