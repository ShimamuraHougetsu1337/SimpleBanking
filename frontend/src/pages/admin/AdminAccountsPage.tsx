import { Card, Typography, Space, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAdminAccounts } from '@/hooks/admin/useAdminAccounts';
import type { AdminAccount } from '@/services/admin.service';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { AdminAccountTable } from '@/components/admin/accounts/AdminAccountTable';
import { AdminDepositModal } from '@/components/admin/accounts/AdminDepositModal';

const { Title } = Typography;

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

  const openDepositModal = (account: AdminAccount) => {
    setSelectedAccount(account);
    setDepositModalVisible(true);
  };

  const closeDepositModal = () => {
    setDepositModalVisible(false);
    setSelectedAccount(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Quản Lý Tài Khoản</Title>
        <Space>
          <Input
            placeholder="Tìm kiếm bằng số tài khoản, tên, email..."
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            style={{ width: 350, borderRadius: 8, height: 40 }}
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
          />
        </Space>
      </div>

      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        <AdminAccountTable
          accounts={accounts}
          page={page}
          pageSize={pageSize}
          total={total}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          onFreezeAccount={handleFreezeAccount}
          onUnfreezeAccount={handleUnfreezeAccount}
          onOpenDepositModal={openDepositModal}
        />
      </Card>

      <AdminDepositModal
        open={depositModalVisible}
        account={selectedAccount}
        onCancel={closeDepositModal}
        onDeposit={handleDeposit}
        isDepositing={isDepositing}
      />
    </div>
  );
}
