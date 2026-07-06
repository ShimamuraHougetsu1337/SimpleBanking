import { useState } from 'react';
import { Typography, Spin, Alert, Modal } from 'antd';
import { BalanceCard } from '@/components/customer/dashboard/BalanceCard';
import { AccountDetailsCard } from '@/components/customer/dashboard/AccountDetailsCard';
import { useDashboardData, type Account } from '@/hooks/customer/useDashboardData';
import { WithdrawModal } from '@/components/customer/transactions/TransactionModals';
import { AccountSettingsForm } from '@/components/customer/account/AccountSettingsForm';
import { TransactionResultModal } from '@/components/customer/transactions/TransactionResultModal';

const { Title } = Typography;

export default function DashboardPage() {
  const [withdrawAccount, setWithdrawAccount] = useState<Account | null>(null);
  const [settingsAccount, setSettingsAccount] = useState<Account | null>(null);
  const [resultTx, setResultTx] = useState<{
    status: 'success' | 'failed';
    errorMsg?: string;
    txData?: any;
  } | null>(null);

  const {
    accounts,
    loading,
    error,
    hasAccountsLoaded,
  } = useDashboardData();

  if (loading && !hasAccountsLoaded) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Lỗi" description="Không thể tải dữ liệu tổng quan." type="error" showIcon style={{ margin: '20px' }} />;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Tổng quan</Title>
      </div>

      <div style={{ marginBottom: 32 }}>
        {accounts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {accounts.map((account: Account) => {
              const themeGradient = account.theme || 'linear-gradient(135deg, #111827 0%, #000000 100%)';

              return (
                <div key={account.id}>
                  <div style={{ marginBottom: 24 }}>
                    <BalanceCard
                      accountNumber={account.accountNumber}
                      name={account.name}
                      balance={Number(account.balance)}
                      owner={account.user?.fullName || 'User'}
                      currency={account.currency}
                      themeGradient={themeGradient}
                    />
                  </div>
                  <AccountDetailsCard
                    account={account}
                    onWithdraw={(acc) => setWithdrawAccount(acc)}
                    onSettings={(acc) => setSettingsAccount(acc)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div>Không tìm thấy tài khoản nào.</div>
        )}
      </div>

      <WithdrawModal
        isOpen={!!withdrawAccount}
        onClose={() => setWithdrawAccount(null)}
        accountId={withdrawAccount?.id || ''}
        onSuccess={(tx) => {
          setResultTx({
            status: 'success',
            txData: {
              id: tx.id,
              type: 'withdraw',
              amount: tx.amount,
              fromAccount: withdrawAccount?.accountNumber,
              description: tx.description,
              createdAt: tx.createdAt,
            }
          });
        }}
      />

      <TransactionResultModal
        visible={!!resultTx}
        status={resultTx?.status || 'success'}
        errorMsg={resultTx?.errorMsg}
        txData={resultTx?.txData}
        onClose={() => setResultTx(null)}
      />

      <Modal
        title="Cài đặt tài khoản"
        open={!!settingsAccount}
        onCancel={() => setSettingsAccount(null)}
        footer={null}
        centered
        destroyOnHidden
      >
        {settingsAccount && (
          <AccountSettingsForm
            accountId={settingsAccount.id}
            initialValues={{
              name: settingsAccount.name,
              theme: settingsAccount.theme || 'linear-gradient(135deg, #111827 0%, #000000 100%)',
            }}
            onSuccess={() => setSettingsAccount(null)}
          />
        )}
      </Modal>
    </div>
  );
}
