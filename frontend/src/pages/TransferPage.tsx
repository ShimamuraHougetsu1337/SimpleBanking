import { Typography, message, Form } from 'antd';
import { useState, useEffect } from 'react';
import { useTransfer } from '../hooks/client/useTransfer';
import { v4 as uuidv4 } from 'uuid';
import { getErrorMessage } from '../utils/error';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { TransferForm } from '../components/transfer/TransferForm';
import { TransferReviewModal } from '../components/transfer/TransferReviewModal';
import { TransactionResultModal } from '@/components/transactions/TransactionResultModal';

const { Title } = Typography;

export default function TransferPage() {
  const [form] = Form.useForm();
  const { mutate: transfer, isPending } = useTransfer();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pendingValues, setPendingValues] = useState<any>(null);
  const [receiver, setReceiver] = useState<any>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resultTx, setResultTx] = useState<{
    status: 'success' | 'failed';
    errorMsg?: string;
    txData?: any;
  } | null>(null);

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
        message.error('Không tìm thấy tài khoản thụ hưởng');
      } else {
        message.error('Lỗi hệ thống khi tìm tài khoản. Vui lòng thử lại sau.');
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
      onSuccess: (data) => {
        setIsModalVisible(false);
        setResultTx({
          status: 'success',
          txData: {
            id: data.id,
            type: 'transfer',
            amount: data.amount,
            fromAccount: selectedAccount?.accountNumber,
            toAccount: pendingValues.to_accountNumber,
            description: data.description,
            createdAt: data.createdAt,
          }
        });
        form.resetFields(['to_accountNumber', 'amount', 'description']);
        setPendingValues(null);
        setReceiver(null);
      },
      onError: (err) => {
        setIsModalVisible(false);
        setResultTx({
          status: 'failed',
          errorMsg: getErrorMessage(err),
        });
      }
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const selectedAccount = accounts?.find((acc: any) => acc.id === pendingValues?.from_accountId);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 60 }}>
      <Title level={2} style={{ marginBottom: 24 }}>Chuyển tiền</Title>

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

      <TransactionResultModal
        visible={!!resultTx}
        status={resultTx?.status || 'success'}
        errorMsg={resultTx?.errorMsg}
        txData={resultTx?.txData}
        onClose={() => setResultTx(null)}
      />
    </div>
  );
}
