import {
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Button,
  Input,
  ConfigProvider,
  Modal,
  Form,
  InputNumber,
} from 'antd';
import {
  SearchOutlined,
  LockOutlined,
  UnlockOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useAdminAccounts, type AdminAccount } from '@/hooks/admin/useAdminAccounts';
import { useState } from 'react';
import type { ChangeEvent } from 'react';

const { Title, Text } = Typography;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
};

export default function AdminAccountsPage() {
  const {
    accounts,
    total,
    page,
    pageSize,
    searchQuery,
    handleSearchChange,
    handlePageChange,
    handleFreezeAccount,
    handleUnfreezeAccount,
    handleDeposit,
    isDepositing,
    isLoading,
  } = useAdminAccounts();

  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null);
  const [form] = Form.useForm();

  const formatVND = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  const openDepositModal = (account: AdminAccount) => {
    setSelectedAccount(account);
    setDepositModalVisible(true);
  };

  const closeDepositModal = () => {
    setDepositModalVisible(false);
    setSelectedAccount(null);
    form.resetFields();
  };

  const onDepositSubmit = (values: any) => {
    if (selectedAccount) {
      handleDeposit(selectedAccount.id, values.amount.toString(), values.description);
      closeDepositModal();
    }
  };

  const columns = [
    {
      title: 'Account Number',
      key: 'accountNumber',
      align: 'left' as const,
      render: (record: AdminAccount) => (
        <Text copyable strong style={{ color: '#1e293b' }}>{record.accountNumber}</Text>
      ),
    },
    {
      title: 'Owner',
      key: 'owner',
      align: 'left' as const,
      render: (record: AdminAccount) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1e293b' }}>{record.ownerName}</Text>
          <Text type="secondary" style={{ fontSize: 13, color: '#64748b' }}>{record.ownerEmail}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => (
        <Tag bordered={false} color={status === 'active' ? 'success' : 'error'} style={{ borderRadius: 12, padding: '0 12px', fontWeight: 500 }}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: (balance: string) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#1e293b' }}>
          {formatVND(balance)}
        </Text>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      align: 'right' as const,
      render: (date: string) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#64748b' }}>
          {new Date(date).toLocaleDateString('vi-VN')}
        </Text>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center' as const,
      render: (record: AdminAccount) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<DollarOutlined />}
            onClick={() => openDepositModal(record)}
            style={{ color: '#10B981', marginRight: 8 }}
            disabled={record.status !== 'active'}
          >
            Deposit
          </Button>
          {record.status === 'active' ? (
            <Button
              danger
              type="text"
              icon={<LockOutlined />}
              onClick={() => handleFreezeAccount(record.id)}
              style={{ width: 90, textAlign: 'left', display: 'inline-flex', alignItems: 'center' }}
            >
              Lock
            </Button>
          ) : (
            <Button
              type="text"
              style={{ color: '#3B82F6', width: 90, textAlign: 'left', display: 'inline-flex', alignItems: 'center' }}
              icon={<UnlockOutlined />}
              onClick={() => handleUnfreezeAccount(record.id)}
            >
              Unlock
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Account Management</Title>
        <Space>
          <Input
            placeholder="Search by account number, name, email..."
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            style={{ width: 350, borderRadius: 8, height: 40 }}
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
          />
        </Space>
      </div>

      <Card style={CARD_SHADOW_STYLE} bodyStyle={{ padding: 0, overflow: 'hidden' }}>
        <ConfigProvider
          theme={{
            components: {
              Table: {
                headerBg: '#F8FAFC',
                headerColor: '#64748b',
                headerSplitColor: 'transparent',
                rowHoverBg: '#F8FAFC',
                cellPaddingBlock: 16,
                cellPaddingInline: 20,
              },
            },
          }}
        >
          <Table
            columns={columns}
            dataSource={accounts}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              onChange: handlePageChange,
            }}
          />
        </ConfigProvider>
      </Card>

      <Modal
        title={<span style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Deposit to Account</span>}
        open={depositModalVisible}
        onCancel={closeDepositModal}
        footer={null}
        width={400}
      >
        <div style={{ marginBottom: 24 }}>
          <Text type="secondary">Depositing to account </Text>
          <Text strong>{selectedAccount?.accountNumber}</Text>
          <Text type="secondary"> owned by </Text>
          <Text strong>{selectedAccount?.ownerName}</Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onDepositSubmit}
          initialValues={{ description: 'Admin Deposit' }}
        >
          <Form.Item
            name="amount"
            label="Amount (VND)"
            rules={[
              { required: true, message: 'Please input deposit amount!' },
              { type: 'number', min: 1000, message: 'Minimum deposit is 1,000 VND' },
            ]}
          >
            <InputNumber
              style={{ width: '100%', height: 40, borderRadius: 8 }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
              size="large"
            />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <Input
              style={{ height: 40, borderRadius: 8 }}
              maxLength={100}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={isDepositing}
            style={{ height: 44, borderRadius: 8, marginTop: 16 }}
          >
            Confirm Deposit
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
