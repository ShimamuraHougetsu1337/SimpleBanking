import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { adminService } from '@/services/admin.service';
import { message } from 'antd';

export function useAdminAccountsActions() {
  const queryClient = useQueryClient();

  const freezeMutation = useMutation({
    mutationFn: (accountId: string) => adminService.updateAccountStatus(accountId, 'locked'),
    onSuccess: () => {
      message.success('Account frozen successfully');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.accounts.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to freeze account';
      message.error(errMsg);
    },
  });

  const unfreezeMutation = useMutation({
    mutationFn: (accountId: string) => adminService.updateAccountStatus(accountId, 'active'),
    onSuccess: () => {
      message.success('Account unfrozen successfully');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.accounts.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to unfreeze account';
      message.error(errMsg);
    },
  });

  const depositMutation = useMutation({
    mutationFn: ({ accountId, amount, description }: { accountId: string; amount: string; description?: string }) =>
      adminService.depositToAccount(accountId, amount, description),
    onSuccess: (data: unknown) => {
      const status = (data as { status?: string })?.status;
      if (status === 'pending') {
        message.info('Giao dịch vượt hạn mức, đã tạo yêu cầu chờ quản lý duyệt!');
      } else {
        message.success('Đã thực hiện giao dịch thành công!');
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.accounts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats.dashboard });
    },
    onError: (err: unknown) => {
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to deposit';
      message.error(errMsg);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: ({ accountId, amount, description }: { accountId: string; amount: string; description?: string }) =>
      adminService.withdrawFromAccount(accountId, amount, description),
    onSuccess: (data: unknown) => {
      const status = (data as { status?: string })?.status;
      if (status === 'pending') {
        message.info('Giao dịch rút tiền vượt hạn mức, đã tạo yêu cầu chờ quản lý duyệt!');
      } else {
        message.success('Đã thực hiện giao dịch rút tiền thành công!');
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.accounts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats.dashboard });
    },
    onError: (err: unknown) => {
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to withdraw';
      message.error(errMsg);
    },
  });

  const transferMutation = useMutation({
    mutationFn: ({ accountId, toAccountNumber, amount, description }: { accountId: string; toAccountNumber: string; amount: string; description?: string }) =>
      adminService.transferFromAccount(accountId, toAccountNumber, amount, description),
    onSuccess: (data: unknown) => {
      const status = (data as { status?: string })?.status;
      if (status === 'pending') {
        message.info('Giao dịch chuyển khoản vượt hạn mức, đã tạo yêu cầu chờ quản lý duyệt!');
      } else {
        message.success('Đã thực hiện giao dịch chuyển khoản thành công!');
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.accounts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats.dashboard });
    },
    onError: (err: unknown) => {
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to transfer';
      message.error(errMsg);
    },
  });

  const updateDailyLimitMutation = useMutation({
    mutationFn: ({ accountId, dailyLimit }: { accountId: string; dailyLimit: string | null }) =>
      adminService.updateDailyLimit(accountId, dailyLimit),
    onSuccess: () => {
      message.success('Cập nhật hạn mức ngày thành công');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.accounts.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Không thể cập nhật hạn mức';
      message.error(errMsg);
    },
  });

  const handleFreezeAccount = (accountId: string) => {
    freezeMutation.mutate(accountId);
  };

  const handleUnfreezeAccount = (accountId: string) => {
    unfreezeMutation.mutate(accountId);
  };

  const handleDeposit = (accountId: string, amount: string, description?: string) => {
    depositMutation.mutate({ accountId, amount, description });
  };

  const handleWithdraw = (accountId: string, amount: string, description?: string) => {
    withdrawMutation.mutate({ accountId, amount, description });
  };

  const handleTransfer = (accountId: string, toAccountNumber: string, amount: string, description?: string) => {
    transferMutation.mutate({ accountId, toAccountNumber, amount, description });
  };

  const handleUpdateDailyLimit = (accountId: string, dailyLimit: string | null) => {
    updateDailyLimitMutation.mutate({ accountId, dailyLimit });
  };

  return {
    handleFreezeAccount,
    handleUnfreezeAccount,
    handleDeposit,
    handleWithdraw,
    handleTransfer,
    handleUpdateDailyLimit,
    isDepositing: depositMutation.isPending,
    isWithdrawing: withdrawMutation.isPending,
    isTransferring: transferMutation.isPending,
    isUpdatingDailyLimit: updateDailyLimitMutation.isPending,
  };
}
