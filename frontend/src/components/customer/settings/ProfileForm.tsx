import { Form, Input, Button, Typography } from 'antd';
import { useProfile, useUpdateProfile } from '@/hooks/customer/useSettings';
import { useEffect } from 'react';

const { Text } = Typography;

export default function ProfileForm() {
  const { data: profile } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const [profileForm] = Form.useForm();

  // Pre-fill profile form when data loads
  useEffect(() => {
    if (profile) {
      profileForm.setFieldsValue({
        fullName: profile.fullName,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
      });
    }
  }, [profile, profileForm]);

  const handleUpdateProfile = (values: { fullName: string; phoneNumber?: string }) => {
    updateProfileMutation.mutate(values);
  };

  return (
    <Form
      form={profileForm}
      layout="vertical"
      onFinish={handleUpdateProfile}
      requiredMark={false}
      validateTrigger="onSubmit"
    >
      <Form.Item
        label={<Text style={{ fontWeight: 500, color: '#475569' }}>Địa chỉ Email</Text>}
        name="email"
      >
        <Input disabled size="large" style={{ background: '#f8fafc', color: '#64748b' }} />
      </Form.Item>

      <Form.Item
        label={<Text style={{ fontWeight: 500, color: '#475569' }}>Họ và tên</Text>}
        name="fullName"
        rules={[
          { required: true, message: 'Vui lòng nhập họ và tên' },
          { min: 2, message: 'Họ và tên phải từ 2 ký tự trở lên' },
          { max: 100, message: 'Họ và tên không được vượt quá 100 ký tự' },
        ]}
      >
        <Input size="large" placeholder="Nhập họ và tên của bạn" />
      </Form.Item>

      <Form.Item
        label={<Text style={{ fontWeight: 500, color: '#475569' }}>Số điện thoại</Text>}
        name="phoneNumber"
        rules={[
          { required: true, message: 'Vui lòng nhập số điện thoại' },
          { pattern: /^[0-9+\-\s()]{10,15}$/, message: 'Số điện thoại không hợp lệ (10-15 chữ số)' },
        ]}
      >
        <Input size="large" placeholder="Nhập số điện thoại của bạn" />
      </Form.Item>

      <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={updateProfileMutation.isPending}
          style={{
            background: '#3B82F6',
            borderColor: '#3B82F6',
            height: 44,
            padding: '0 24px',
            borderRadius: 6,
            fontWeight: 500,
          }}
        >
          Lưu thay đổi
        </Button>
      </Form.Item>
    </Form>
  );
}
