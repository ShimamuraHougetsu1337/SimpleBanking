import { Typography, message, Form } from 'antd';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTransfer } from '../../hooks/customer/useTransfer';
import { v4 as uuidv4 } from 'uuid';
import { getErrorMessage } from '../../utils/error';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import api from '../../services/api';
import { TransferForm } from '../../components/customer/transfer/TransferForm';
import { TransferReviewModal } from '../../components/customer/transfer/TransferReviewModal';
import { TransactionResultModal } from '@/components/customer/transactions/result-modal/TransactionResultModal';
import { OtpVerificationModal } from '../../components/customer/transfer/OtpVerificationModal';
import { type TxData } from '@/components/customer/transactions/result-modal/TransactionSuccessState';
import { TransactionStatus } from '@/types/transaction';

const { Title } = Typography;

interface TransferValues {
  from_accountId: string;
  to_accountNumber: string;
  amount: string;
  description?: string;
}

interface AccountInfo {
  id: string;
  accountNumber: string;
  balance: string;
  [key: string]: unknown;
}

export default function TransferPage() {
  const location = useLocation();
  const [form] = Form.useForm();
  const { mutate: transfer, isPending } = useTransfer();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pendingValues, setPendingValues] = useState<TransferValues | null>(null);
  const [receiver, setReceiver] = useState<Record<string, unknown> | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isOtpModalVisible, setIsOtpModalVisible] = useState(false);
  const [otpTransactionId, setOtpTransactionId] = useState<string | null>(null);
  const [resultTx, setResultTx] = useState<{
    status: 'success' | 'failed';
    errorMsg?: string;
    txData?: TxData;
  } | null>(null);

  const { data: accounts, isLoading: isLoadingAccounts } = useQuery<AccountInfo[]>({
    queryKey: queryKeys.accounts.me(),
    queryFn: async () => {
      const { data } = await api.get('/accounts/me');
      return data;
    },
  });

  const { data: feeData } = useQuery({
    queryKey: queryKeys.settings.transferFee,
    queryFn: async () => {
      const { data } = await api.get('/transactions/transfer-fee');
      return data;
    },
  });
  const transferFee = feeData?.fee || '0';

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      if (location.state?.fromAccountId) {
        form.setFieldsValue({ from_accountId: location.state.fromAccountId });
      } else if (!form.getFieldValue('from_accountId')) {
        form.setFieldsValue({ from_accountId: accounts[0].id });
      }
    }
  }, [accounts, form, location.state]);

  const onReview = async (values: TransferValues) => {
    try {
      setIsResolving(true);
      const res = await api.get(`/accounts/resolve/${values.to_accountNumber}`);
      setReceiver(res.data as Record<string, unknown>);
      setPendingValues(values);
      setIsModalVisible(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
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
        if (data.status === TransactionStatus.PENDING_OTP) {
          setOtpTransactionId(data.id);
          setIsOtpModalVisible(true);
        } else {
          handleTransferSuccess(data as Record<string, unknown>);
        }
      },
      onError: (err: unknown) => {
        setIsModalVisible(false);
        setResultTx({
          status: 'failed',
          errorMsg: getErrorMessage(err),
        });
      }
    });
  };

  const handleTransferSuccess = (data: Record<string, unknown>) => {
    setResultTx({
      status: 'success',
      txData: {
        id: data.id as string,
        type: 'transfer',
        amount: data.amount as string | number,
        fromAccount: selectedAccount?.accountNumber,
        toAccount: pendingValues?.to_accountNumber,
        description: data.description as string | undefined,
        createdAt: data.createdAt as string,
      }
    });
    form.resetFields(['to_accountNumber', 'amount', 'description']);
    setPendingValues(null);
    setReceiver(null);
  };

  const handleOtpCancel = () => {
    setIsOtpModalVisible(false);
    setOtpTransactionId(null);
    setResultTx({
      status: 'failed',
      errorMsg: 'Giao dịch đã bị hủy bỏ bởi người dùng.',
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const selectedAccount = accounts?.find((acc: AccountInfo) => acc.id === pendingValues?.from_accountId);

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
        fee={transferFee}
      />

      <TransactionResultModal
        visible={!!resultTx}
        status={resultTx?.status || 'success'}
        errorMsg={resultTx?.errorMsg}
        txData={resultTx?.txData}
        onClose={() => setResultTx(null)}
      />

      <OtpVerificationModal
        key={otpTransactionId || 'none'}
        isOpen={isOtpModalVisible}
        onClose={() => setIsOtpModalVisible(false)}
        transactionId={otpTransactionId}
        onSuccess={handleTransferSuccess}
        onCancel={handleOtpCancel}
      />
    </div>
  );
}
