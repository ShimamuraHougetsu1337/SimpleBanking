import { Typography, Button, Spin, Empty, Alert, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { BalanceCard } from '@/components/customer/dashboard/BalanceCard';
import { useAccounts } from '@/hooks/customer/useAccounts';

const AVAILABLE_THEMES = [
  { label: 'Đen kim loại mặc định', value: 'linear-gradient(135deg, #111827 0%, #000000 100%)' },
  { label: 'Xanh đại dương', value: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)' },
  { label: 'Xanh lục bảo', value: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)' },
  { label: 'Tím hoàng gia', value: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)' },
];

const { Title } = Typography;

export default function AccountsPage() {
  const {
    accounts,
    isLoading,
    error,
    isModalOpen,
    form,
    isCreating,
    handleOpenModal,
    handleCloseModal,
    handleOk,
    navigate,
  } = useAccounts();

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Lỗi khi tải danh sách tài khoản" type="error" showIcon style={{ margin: '20px' }} />;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Tài khoản của tôi</Title>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleOpenModal}
          style={{ borderRadius: 8 }}
        >
          Mở tài khoản mới
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Empty description="Bạn chưa có tài khoản nào." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 20 }}>
          {accounts.map((account) => {
            const themeGradient = account.theme || 'linear-gradient(135deg, #111827 0%, #000000 100%)';
            return (
              <div key={account.id}>
                <div
                  onClick={() => navigate(`/accounts/${account.id}`)}
                  style={{ cursor: 'pointer', padding: '0 10px' }}
                >
                  <BalanceCard
                    accountNumber={account.accountNumber}
                    name={account.name}
                    balance={Number(account.balance)}
                    owner={account.user?.fullName || 'Valued Customer'}
                    currency={account.currency}
                    themeGradient={themeGradient}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal
        title="Mở tài khoản mới"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCloseModal}
        confirmLoading={isCreating}
        okText="Mở tài khoản"
        cancelText="Hủy"
        centered
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 24 }}
          initialValues={{
            theme: AVAILABLE_THEMES[0].value,
          }}
        >
          <Form.Item
            name="name"
            label="Tên tài khoản"
            rules={[
              { required: true, message: 'Vui lòng nhập tên tài khoản' },
              { max: 100, message: 'Tên tài khoản không được dài quá 100 ký tự' },
            ]}
          >
            <Input placeholder="Ví dụ: Tài khoản tiết kiệm" size="large" />
          </Form.Item>

          <Form.Item
            name="theme"
            label="Giao diện thẻ"
            rules={[{ required: true, message: 'Vui lòng chọn giao diện' }]}
          >
            <Select size="large">
              {AVAILABLE_THEMES.map((theme) => (
                <Select.Option key={theme.value} value={theme.value}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, background: theme.value, borderRadius: 4 }}></div>
                    {theme.label}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
