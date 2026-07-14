import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Button, Typography, Radio, Alert, Space } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { transactionService } from '@/services/transaction.service';
import type { AdminAccount } from '@/types/admin';
import { accountService } from '@/services/account.service';

const { Text } = Typography;

interface AdminTransactionModalProps {
  open: boolean;
  account: AdminAccount | null;
  onCancel: () => void;
  onDeposit: (accountId: string, amount: string, description?: string) => void;
  onWithdraw: (accountId: string, amount: string, description?: string) => void;
  onTransfer: (accountId: string, toAccountNumber: string, amount: string, description?: string) => void;
  isDepositing: boolean;
  isWithdrawing: boolean;
  isTransferring: boolean;
}

export const AdminTransactionModal = ({
  open,
  account,
  onCancel,
  onDeposit,
  onWithdraw,
  onTransfer,
  isDepositing,
  isWithdrawing,
  isTransferring,
}: AdminTransactionModalProps) => {
  const [form] = Form.useForm();
  const [txType, setTxType] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const amountVal = Form.useWatch('amount', form);

  const { data: feeData } = useQuery({
    queryKey: queryKeys.settings.transferFee,
    queryFn: transactionService.getTransferFee,
    enabled: open,
  });
  const transferFee = Number(feeData?.fee || 0);

  // Set default description when open changes
  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        type: 'deposit',
        description: 'Nạp tiền mặt tại quầy',
      });
    }
  }, [open, form]);

  const handleTypeChange = (value: 'deposit' | 'withdraw' | 'transfer') => {
    setTxType(value);
    setResolvedName(null);
    
    let nextDesc = '';
    if (value === 'deposit') nextDesc = 'Nạp tiền mặt tại quầy';
    else if (value === 'withdraw') nextDesc = 'Rút tiền mặt tại quầy';
    else if (value === 'transfer') nextDesc = 'Chuyển khoản tại quầy';

    form.setFieldsValue({ description: nextDesc });
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (/^VN\d{14}$/.test(value)) {
      setIsResolving(true);
      accountService
        .resolveAccountNumber(value)
        .then((res) => {
          if (res && typeof res === 'object' && 'ownerName' in res) {
            setResolvedName(res.ownerName as string);
          } else {
            setResolvedName(null);
          }
        })
        .catch(() => {
          setResolvedName(null);
        })
        .finally(() => {
          setIsResolving(false);
        });
    } else {
      setResolvedName(null);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setTxType('deposit');
    setResolvedName(null);
    onCancel();
  };

  const handleSubmit = (values: { amount: number; description: string; toAccountNumber?: string }) => {
    if (!account) return;

    const amountStr = values.amount.toString();
    if (txType === 'deposit') {
      onDeposit(account.id, amountStr, values.description);
    } else if (txType === 'withdraw') {
      onWithdraw(account.id, amountStr, values.description);
    } else if (txType === 'transfer') {
      onTransfer(account.id, values.toAccountNumber || '', amountStr, values.description);
    }
    handleClose();
  };

  const balance = Number(account?.balance || 0);
  const hold = Number(account?.holdBalance || 0);
  const available = balance - hold;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const isPending = isDepositing || isWithdrawing || isTransferring;

  return (
    <Modal
      title={<span style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Giao Dịch Tại Quầy</span>}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={450}
      destroyOnClose
    >
      <div style={{ marginBottom: 20, backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 }}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <div>
            <Text type="secondary">Tài khoản khách hàng: </Text>
            <Text strong>{account?.accountNumber}</Text>
          </div>
          <div>
            <Text type="secondary">Chủ tài khoản: </Text>
            <Text strong>{account?.ownerName}</Text>
          </div>
          <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #e2e8f0' }}>
            <Text type="secondary">Số dư khả dụng: </Text>
            <Text strong style={{ color: '#10b981' }}>{formatVND(available)}</Text>
            {hold > 0 && (
              <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                (Số dư tạm giữ: {formatVND(hold)})
              </span>
            )}
          </div>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ type: 'deposit', description: 'Nạp tiền mặt tại quầy' }}
      >
        <Form.Item label="Nghiệp vụ giao dịch" name="type" required>
          <Radio.Group
            onChange={(e) => handleTypeChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            style={{ width: '100%', display: 'flex' }}
          >
            <Radio.Button value="deposit" style={{ flex: 1, textAlign: 'center' }}>Nạp tiền</Radio.Button>
            <Radio.Button value="withdraw" style={{ flex: 1, textAlign: 'center' }}>Rút tiền</Radio.Button>
            <Radio.Button value="transfer" style={{ flex: 1, textAlign: 'center' }}>Chuyển tiền</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {txType === 'transfer' && (
          <>
            <Form.Item
              name="toAccountNumber"
              label="Số tài khoản thụ hưởng"
              rules={[
                { required: true, message: 'Vui lòng nhập số tài khoản nhận!' },
                { pattern: /^VN\d{14}$/, message: 'Số tài khoản phải bắt đầu bằng VN và tiếp theo là 14 chữ số' },
                {
                  validator: (_, val) => {
                    if (val && val.trim() === account?.accountNumber) {
                      return Promise.reject('Không thể chuyển khoản cho chính tài khoản nguồn!');
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input
                placeholder="VN10001000001002"
                size="large"
                style={{ borderRadius: 8 }}
                onChange={handleAccountNumberChange}
              />
            </Form.Item>

            {isResolving && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Đang xác thực tài khoản nhận...</div>}
            
            {resolvedName && (
              <div style={{ marginBottom: 16 }}>
                <Alert
                  type="success"
                  showIcon
                  message={
                    <span>
                      Tên người nhận: <Text strong>{resolvedName}</Text>
                    </span>
                  }
                />
              </div>
            )}
          </>
        )}

        <Form.Item
          name="amount"
          label="Số tiền giao dịch (VND)"
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền giao dịch!' },
            { type: 'number', min: 1000, message: 'Số tiền tối thiểu là 1,000 VND' },
            {
              validator: (_, value) => {
                if (txType !== 'deposit' && value) {
                  const checkAmount = txType === 'transfer' ? Number(value) + transferFee : Number(value);
                  if (checkAmount > available) {
                    return Promise.reject(txType === 'transfer'
                      ? 'Số dư không đủ để thanh toán số tiền chuyển và phí giao dịch!'
                      : 'Số tiền vượt quá số dư khả dụng!'
                    );
                  }
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            style={{ width: '100%', height: 40, borderRadius: 8 }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            size="large"
            placeholder="Nhập số tiền"
          />
        </Form.Item>

        {txType === 'transfer' && amountVal && Number(amountVal) > 0 && (
          <div style={{ marginTop: -12, marginBottom: 16, backgroundColor: '#f0fdf4', padding: '8px 12px', borderRadius: 6, border: '1px dashed #bbf7d0' }}>
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Phí giao dịch:</Text>
                <Text strong style={{ fontSize: 13 }}>{formatVND(transferFee)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #dcfce7', paddingTop: 4, marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Tổng số tiền trừ:</Text>
                <Text strong style={{ color: '#059669', fontSize: 13 }}>{formatVND(Number(amountVal) + transferFee)}</Text>
              </div>
            </Space>
          </div>
        )}

        <Form.Item
          name="description"
          label="Nội dung mô tả"
          rules={[{ required: true, message: 'Vui lòng nhập nội dung giao dịch!' }]}
        >
          <Input style={{ height: 40, borderRadius: 8 }} maxLength={100} />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          loading={isPending}
          style={{ height: 44, borderRadius: 8, marginTop: 16, fontSize: 15, fontWeight: 500 }}
        >
          {txType === 'deposit' ? 'Xác nhận nạp tiền' : txType === 'withdraw' ? 'Xác nhận rút tiền' : 'Xác nhận chuyển khoản'}
        </Button>
      </Form>
    </Modal>
  );
};
