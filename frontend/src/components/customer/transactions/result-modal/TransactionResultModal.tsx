import { Modal } from 'antd';
import { TransactionSuccessState, type TxData } from './TransactionSuccessState';
import { TransactionFailedState } from './TransactionFailedState';

interface TransactionResultProps {
  visible: boolean;
  status: 'success' | 'failed';
  errorMsg?: string;
  txData?: TxData;
  onClose: () => void;
  onRetry?: () => void;
}

export function TransactionResultModal({
  visible,
  status,
  errorMsg,
  txData,
  onClose,
  onRetry,
}: TransactionResultProps) {
  const isSuccess = status === 'success';

  return (
    <Modal
      open={visible}
      footer={null}
      closable={false}
      centered
      width={480}
      styles={{ body: { padding: '32px 24px' } }}
      style={{ borderRadius: 16, overflow: 'hidden' }}
      destroyOnHidden
    >
      {isSuccess ? (
        <TransactionSuccessState txData={txData} onClose={onClose} />
      ) : (
        <TransactionFailedState errorMsg={errorMsg} onClose={onClose} onRetry={onRetry} />
      )}
    </Modal>
  );
}
