import { useState } from 'react';
import { Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { accountService } from '@/services/account.service';
import { useCreateAccount } from '@/hooks/customer/useCreateAccount';
import type { Account } from '@/types/account';

export function useAccounts() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const createAccount = useCreateAccount();

  const { data: accounts, isLoading, error } = useQuery<Account[]>({
    queryKey: queryKeys.accounts.me(),
    queryFn: async () => {
      return await accountService.getAccountsMe() as Account[];
    },
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    form.resetFields();
    setIsModalOpen(false);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      createAccount.mutate(values, {
        onSuccess: () => {
          message.success('Mở tài khoản mới thành công!');
          handleCloseModal();
        },
        onError: () => {
          message.error('Không thể mở tài khoản mới. Vui lòng thử lại sau.');
        },
      });
    } catch {
      // Form validation failed
    }
  };

  return {
    accounts: accounts || [],
    isLoading,
    error,
    isModalOpen,
    form,
    isCreating: createAccount.isPending,
    handleOpenModal,
    handleCloseModal,
    handleOk,
    navigate,
  };
}
