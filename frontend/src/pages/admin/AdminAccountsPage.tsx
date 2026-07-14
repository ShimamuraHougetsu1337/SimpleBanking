import { Card, Typography, Space, Input, Tabs } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAdminAccounts } from '@/hooks/admin/useAdminAccounts';
import type { AdminAccount } from '@/types/admin';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { AdminAccountTable } from '@/components/admin/accounts/AdminAccountTable';
import { AdminTransactionModal } from '@/components/admin/accounts/AdminTransactionModal';
import { LimitModal } from '@/components/admin/accounts/LimitModal';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/roles';

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
    type,
    handleTypeChange,
    handleSearchChange,
    handlePageChange,
    handleFreezeAccount,
    handleUnfreezeAccount,
    handleDeposit,
    handleWithdraw,
    handleTransfer,
    handleUpdateDailyLimit,
    isUpdatingDailyLimit,
    isDepositing,
    isWithdrawing,
    isTransferring,
    isLoading,
  } = useAdminAccounts();

  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [limitModalVisible, setLimitModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null);
  const currentUser = useAuthStore((s) => s.user);

  const openTransactionModal = (account: AdminAccount) => {
    setSelectedAccount(account);
    setTransactionModalVisible(true);
  };

  const closeTransactionModal = () => {
    setTransactionModalVisible(false);
    setSelectedAccount(null);
  };

  const openLimitModal = (account: AdminAccount) => {
    setSelectedAccount(account);
    setLimitModalVisible(true);
  };

  const closeLimitModal = () => {
    setLimitModalVisible(false);
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

      {currentUser?.role !== UserRole.TELLER && currentUser?.role !== UserRole.MANAGER && (
        <Tabs
          activeKey={type}
          onChange={(key) => handleTypeChange(key as 'customer' | 'system')}
          items={[
            { key: 'customer', label: 'Tài khoản khách hàng' },
            { key: 'system', label: 'Tài khoản hệ thống' },
          ]}
          style={{ marginBottom: 16 }}
        />
      )}

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
          onOpenTransactionModal={openTransactionModal}
          onOpenLimitModal={currentUser?.role === UserRole.TELLER ? undefined : openLimitModal}
          isSystemTab={type === 'system'}
        />
      </Card>

      <AdminTransactionModal
        open={transactionModalVisible}
        account={selectedAccount}
        onCancel={closeTransactionModal}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
        onTransfer={handleTransfer}
        isDepositing={isDepositing}
        isWithdrawing={isWithdrawing}
        isTransferring={isTransferring}
      />

      <LimitModal
        open={limitModalVisible}
        account={selectedAccount}
        onCancel={closeLimitModal}
        onUpdateLimit={handleUpdateDailyLimit}
        isUpdating={isUpdatingDailyLimit}
      />
    </div>
  );
}
