import { Typography } from 'antd';
import { useTransferFlow } from '@/hooks/customer/useTransferFlow';
import { TransferForm } from '@/components/customer/transfer/TransferForm';
import { TransferReviewModal } from '@/components/customer/transfer/TransferReviewModal';
import { TransactionResultModal } from '@/components/customer/transactions/result-modal/TransactionResultModal';
import { OtpVerificationModal } from '@/components/customer/transfer/OtpVerificationModal';

const { Title } = Typography;

export default function TransferPage() {
  const {
    form,
    accounts,
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
  } = useTransferFlow();

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
        onFailure={handleOtpFailure}
      />
    </div>
  );
}
