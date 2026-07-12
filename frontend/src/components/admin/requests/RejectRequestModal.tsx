import { Modal, Input } from 'antd';
import { useState } from 'react';

interface RejectRequestModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  isConfirming: boolean;
}

export const RejectRequestModal = ({ open, onCancel, onConfirm, isConfirming }: RejectRequestModalProps) => {
  const [rejectReason, setRejectReason] = useState('');

  const handleCancel = () => {
    setRejectReason('');
    onCancel();
  };

  const handleOk = () => {
    onConfirm(rejectReason.trim());
    setRejectReason('');
  };

  const isInvalid = !rejectReason.trim() || rejectReason.length > 1000;

  return (
    <Modal
      title={<span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Lý do từ chối giao dịch</span>}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={isConfirming}
      okText="Từ chối"
      cancelText="Hủy"
      okButtonProps={{ danger: true, disabled: isInvalid }}
    >
      <div style={{ marginTop: 16 }}>
        <Input.TextArea
          rows={4}
          placeholder="Nhập lý do từ chối giao dịch (ví dụ: Sai số tài khoản, thiếu chữ ký...)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          maxLength={1000}
          showCount
        />
      </div>
    </Modal>
  );
};
