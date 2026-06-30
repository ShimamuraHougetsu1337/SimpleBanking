import { Typography, message, Form } from 'antd';
import { useState, useEffect } from 'react';
import { useTransfer } from '../hooks/useTransfer';
import { v4 as uuidv4 } from 'uuid';
import { getErrorMessage } from '../utils/error';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { TransferForm } from '../components/transfer/TransferForm';
import { TransferReviewModal } from '../components/transfer/TransferReviewModal';

const { Title } = Typography;

export default function TransferPage() {
  const [form] = Form.useForm();
  const { mutate: transfer, isPending } = useTransfer();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pendingValues, setPendingValues] = useState<any>(null);
  const [receiver, setReceiver] = useState<any>(null);
  const [isResolving, setIsResolving] = useState(false);

  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/accounts/me');
      return data;
    },
  });

  useEffect(() => {
    if (accounts && accounts.length > 0 && !form.getFieldValue('from_accountId')) {
      form.setFieldsValue({ from_accountId: accounts[0].id });
    }
  }, [accounts, form]);

  const onReview = async (values: any) => {
    try {
      setIsResolving(true);
      const res = await api.get(`/accounts/resolve/${values.to_accountNumber}`);
      setReceiver(res.data);
      setPendingValues(values);
      setIsModalVisible(true);
    } catch (err: any) {
      if (err.response?.status === 404) {
        message.error('Destination account not found');
      } else {
        message.error('Failed to resolve account. Please try again later.');
      }
    } finally {
      setIsResolving(false);
    }
  };

  const handleConfirm = () => {
    if (!pendingValues) return;
    transfer({
      from_accountId: pendingValues.from_accountId,
      to_accountNumber: pendingValues.to_accountNumber,
      amount: pendingValues.amount,
      description: pendingValues.description,
      idempotencyKey: uuidv4(),
    }, {
      onSuccess: () => {
        message.success('Transfer successful');
        form.resetFields(['to_accountNumber', 'amount', 'description']);
        setIsModalVisible(false);
        setPendingValues(null);
        setReceiver(null);
      },
      onError: (err) => {
        message.error(getErrorMessage(err));
      }
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const selectedAccount = accounts?.find((acc: any) => acc.id === pendingValues?.from_accountId);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 60 }}>
      <Title level={2} style={{ marginBottom: 24 }}>Transfers</Title>

      <TransferForm
        form={form}
        accounts={accounts}
        isLoadingAccounts={isLoadingAccounts}
        onReview={onReview}
        isResolving={isResolving}
      />

      <TransferReviewModal
        isOpen={isModalVisible}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isPending={isPending}
        pendingValues={pendingValues}
        selectedAccount={selectedAccount}
        receiver={receiver}
      />
    </div>
  );
}
