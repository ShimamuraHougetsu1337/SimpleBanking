import { Modal, Form, Input, Select } from 'antd';
import { UserRole } from '@/constants/roles';

interface UserCreateModalProps {
  open: boolean;
  onCancel: () => void;
  onFinish: (values: Record<string, unknown>) => void;
  isPending: boolean;
  currentUserRole?: string;
}

export const UserCreateModal = ({ open, onCancel, onFinish, isPending, currentUserRole }: UserCreateModalProps) => {
  const [form] = Form.useForm();

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleFinish = (values: Record<string, unknown>) => {
    onFinish(values);
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      title={<span style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Thêm Người Dùng Mới</span>}
      okText="Tạo mới"
      cancelText="Hủy"
      onOk={() => form.submit()}
      confirmLoading={isPending}
      destroyOnClose
      centered
      width={480}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        style={{ marginTop: 24 }}
        initialValues={{ role: UserRole.CUSTOMER }}
      >
        <Form.Item
          name="fullName"
          label="Họ và tên"
          rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
        >
          <Input placeholder="Nhập họ và tên đầy đủ" />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input placeholder="Nhập địa chỉ email" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Mật khẩu"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu' },
            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
          ]}
        >
          <Input.Password placeholder="Nhập mật khẩu (Mật khẩu phải có ít nhất 6 ký tự)" />
        </Form.Item>
        {currentUserRole === UserRole.SUPERADMIN && (
          <Form.Item
            name="role"
            label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select
              placeholder="Chọn vai trò"
              options={[
                { value: UserRole.TELLER, label: 'Giao dịch viên (Teller)' },
                { value: UserRole.MANAGER, label: 'Quản lý (Manager)' },
              ]}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
