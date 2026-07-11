import { Modal, Button, Input, Space, Typography, message } from 'antd';
import { useState, useEffect, useRef } from 'react';
import { SafetyCertificateOutlined, ReloadOutlined } from '@ant-design/icons';
import { transactionService } from '@/services/transaction.service';
import { getErrorMessage } from '@/utils/error';

const { Text, Title } = Typography;

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string | null;
  onSuccess: (txData: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function OtpVerificationModal({
  isOpen,
  onClose,
  transactionId,
  onSuccess,
  onCancel,
}: OtpVerificationModalProps) {
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || !transactionId) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = timer;

    return () => {
      clearInterval(timer);
    };
  }, [isOpen, transactionId]);

  const handleVerify = async () => {
    if (!transactionId) return;
    if (otpCode.length !== 6) {
      message.error('Vui lòng nhập đầy đủ mã OTP 6 chữ số');
      return;
    }

    try {
      setIsVerifying(true);
      const data = await transactionService.verifyOtp(transactionId, otpCode);
      message.success('Xác thực giao dịch thành công!');
      if (timerRef.current) clearInterval(timerRef.current);
      onClose();
      onSuccess(data as Record<string, unknown>);
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err);
      message.error(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!transactionId) return;

    try {
      setResendLoading(true);
      await transactionService.resendOtp(transactionId);
      message.success('Đã gửi lại mã OTP mới!');
      setOtpCode('');
      setCountdown(300);
      
      // Reset timer
      if (timerRef.current) clearInterval(timerRef.current);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      timerRef.current = timer;
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = countdown === 0;

  return (
    <Modal
      open={isOpen}
      footer={null}
      closable={false}
      maskClosable={false}
      centered
      width={440}
      styles={{ body: { padding: '32px 24px' } }}
      style={{ borderRadius: 16, overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        {/* Header Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: isExpired ? '#FEF2F2' : '#ECFDF5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isExpired ? '#EF4444' : '#10B981',
            fontSize: 28,
            marginBottom: 20,
          }}
        >
          <SafetyCertificateOutlined />
        </div>

        {/* Modal Titles */}
        <Title level={4} style={{ margin: '0 0 8px 0', color: '#1e293b' }}>
          Xác thực mã OTP
        </Title>
        <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 24, paddingInline: 12 }}>
          Mã xác thực giao dịch đã được tạo. Vui lòng nhập mã OTP để xác nhận và hoàn tất chuyển khoản.
        </Text>

        {/* OTP Input Component */}
        <div style={{ marginBottom: 24 }}>
          <Input.OTP
            length={6}
            value={otpCode}
            onChange={(val) => setOtpCode(val)}
            disabled={isVerifying || isExpired}
            size="large"
            style={{ height: 50 }}
          />
        </div>

        {/* Expiry Timer */}
        <div style={{ marginBottom: 28 }}>
          {isExpired ? (
            <Text type="danger" strong>Mã OTP đã hết hiệu lực</Text>
          ) : (
            <Space>
              <Text type="secondary">Mã OTP hiệu lực trong:</Text>
              <Text strong style={{ color: countdown < 60 ? '#EF4444' : '#10B981', fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(countdown)}
              </Text>
            </Space>
          )}
        </div>

        {/* Buttons Section */}
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Button
            type="primary"
            size="large"
            block
            loading={isVerifying}
            disabled={otpCode.length !== 6 || isExpired}
            onClick={handleVerify}
            style={{
              height: 48,
              borderRadius: 8,
              background: isExpired ? '#cbd5e1' : '#10B981',
              borderColor: isExpired ? '#cbd5e1' : '#10B981',
              fontWeight: 600,
            }}
          >
            Xác nhận giao dịch
          </Button>

          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 8 }}>
            <Button
              type="link"
              onClick={handleResend}
              loading={resendLoading}
              disabled={isVerifying}
              icon={<ReloadOutlined />}
              style={{ color: '#3B82F6', padding: 0 }}
            >
              Gửi lại mã OTP
            </Button>
            <Button
              type="text"
              onClick={onCancel}
              disabled={isVerifying}
              style={{ color: '#64748b', padding: 0 }}
            >
              Hủy bỏ
            </Button>
          </div>
        </Space>
      </div>
    </Modal>
  );
}
