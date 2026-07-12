import { Modal, Form, Radio, Space, InputNumber, Button } from 'antd';
import { formatVnd } from '@/utils/format';
import { useLimitModal } from '@/hooks/admin/useLimitModal';
import type { LimitModalProps } from '@/types/account';

export const LimitModal = ({ open, account, onCancel, onUpdateLimit, isUpdating }: LimitModalProps) => {
  const {
    form,
    systemLimit,
    handleCancel,
    handleFinish,
  } = useLimitModal({ open, account, onCancel, onUpdateLimit });

  return (
    <Modal
      title={<span style={{ fontSize: 18, color: '#1e293b', fontWeight: 600 }}>Cấu hình hạn mức giao dịch ngày</span>}
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnClose
      centered
      width={450}
    >
      {account && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{
            limitType: account.dailyLimit ? 'custom' : 'default',
            dailyLimit: account.dailyLimit ? Number(account.dailyLimit) : null,
          }}
          style={{ marginTop: 16 }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>Tài khoản</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
              {account.accountNumber} ({account.ownerName})
            </div>
          </div>

          <Form.Item name="limitType" label="Loại hạn mức" rules={[{ required: true }]}>
            <Radio.Group style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="default">Sử dụng hạn mức hệ thống (Mặc định: {formatVnd(systemLimit)})</Radio>
                <Radio value="custom">Hạn mức tùy chỉnh riêng</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.limitType !== currentValues.limitType}
          >
            {({ getFieldValue }) =>
              getFieldValue('limitType') === 'custom' ? (
                <Form.Item
                  name="dailyLimit"
                  label="Hạn mức ngày tối đa (VND)"
                  rules={[
                    { required: true, message: 'Vui lòng nhập hạn mức ngày' },
                    {
                      validator: (_, value) => {
                        if (value !== null && value <= 0) {
                          return Promise.reject(new Error('Hạn mức phải lớn hơn 0'));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%', borderRadius: 8 }}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                    placeholder="Nhập số tiền hạn mức (VND)"
                    size="large"
                    min={1 as number}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCancel} style={{ borderRadius: 8 }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={isUpdating} style={{ borderRadius: 8, background: '#3B82F6' }}>
                Lưu thay đổi
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};
