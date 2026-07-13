import { useState, useEffect } from 'react';
import { Form, message } from 'antd';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { accountService } from '@/services/account.service';
import type { Account } from '@/types/account';
import { transactionService } from '@/services/transaction.service';
import { useTransfer } from './useTransfer';
import { v4 as uuidv4 } from 'uuid';
import { getErrorMessage } from '@/utils/error';
import { TransactionStatus } from '@/types/transaction';
import type { TxData } from '@/components/customer/transactions/result-modal/TransactionSuccessState';

export interface TransferValues {
  from_accountId: string;
  to_accountNumber: string;
  amount: string;
  description?: string;
}

export function useTransferFlow() {
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

  const { data: accounts, isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: queryKeys.accounts.me(),
    queryFn: accountService.getAccountsMe,
  });

  const { data: feeData } = useQuery({
    queryKey: queryKeys.settings.transferFee,
    queryFn: transactionService.getTransferFee,
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
      const res = await accountService.resolveAccountNumber(values.to_accountNumber);
      setReceiver(res);
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

  const selectedAccount = accounts?.find((acc) => acc.id === pendingValues?.from_accountId);

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

  const handleOtpCancel = () => {
    setIsOtpModalVisible(false);
    setOtpTransactionId(null);
    setResultTx({
      status: 'failed',
      errorMsg: 'Giao dịch đã bị hủy bỏ bởi người dùng.',
    });
  };

  const handleOtpFailure = (errorMsg: string) => {
    setIsOtpModalVisible(false);
    setOtpTransactionId(null);
    setResultTx({
      status: 'failed',
      errorMsg,
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return {
    form,
    accounts: accounts || [],
    isLoadingAccounts,
    transferFee,
    isModalVisible,
    pendingValues,
    receiver,
    isResolving,
    isOtpModalVisible,
    otpTransactionId,
    resultTx,
    isPending,
    selectedAccount,
    onReview,
    handleConfirm,
    handleCancel,
    handleOtpCancel,
    handleOtpFailure,
    handleTransferSuccess,
    setResultTx,
    setIsOtpModalVisible,
  };
}
