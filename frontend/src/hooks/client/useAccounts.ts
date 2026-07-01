import { useState } from 'react';
import { Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useCreateAccount } from '@/hooks/client/useCreateAccount';

export interface Account {
  id: string;
  accountNumber: string;
  name: string;
  balance: string;
  currency: string;
  theme?: string;
  user?: {
    fullName: string;
  };
}

export function useAccounts() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const createAccount = useCreateAccount();

  const { data: accounts, isLoading, error } = useQuery<Account[]>({
    queryKey: ['accounts', 'me'],
    queryFn: async () => {
      const res = await api.get('/accounts/me');
      return res.data;
    },
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    form.resetFields();
    setIsModalOpen(false);
  };

  const handleOk = () => {
    form.validateFields().then((values) => {
      createAccount.mutate(values, {
        onSuccess: () => {
          message.success('Mở tài khoản mới thành công!');
          handleCloseModal();
        },
        onError: () => {
          message.error('Không thể mở tài khoản mới. Vui lòng thử lại sau.');
        },
      });
    });
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
