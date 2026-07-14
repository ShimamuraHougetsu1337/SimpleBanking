import { Card, Typography } from 'antd';
import { useAdminTransactions } from '@/hooks/admin/useAdminTransactions';
import { useAuthStore } from '@/store/auth.store';
import { AdminTransactionStats } from '@/components/admin/transactions/AdminTransactionStats';
import { AdminTransactionFilters } from '@/components/admin/transactions/AdminTransactionFilters';
import { AdminTransactionTable } from '@/components/admin/transactions/AdminTransactionTable';
import { CARD_SHADOW_STYLE } from '@/components/admin/transactions/admin-transactions.constants';

const { Title } = Typography;

export default function AdminTransactionsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const userRole = currentUser?.role ?? '';

  const {
    transactions,
    total,
    page,
    pageSize,
    searchQuery,
    typeFilter,
    handleSearchChange,
    handleTypeFilterChange,
    handleDateRangeChange,
    handlePageChange,
    handleReverseTransaction,
    handleRequestReversal,
    stats,
  } = useAdminTransactions();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Tất Cả Giao Dịch</Title>
      </div>

      <AdminTransactionStats stats={stats} />

      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        <AdminTransactionFilters
          searchQuery={searchQuery}
          typeFilter={typeFilter}
          onSearchChange={handleSearchChange}
          onTypeFilterChange={handleTypeFilterChange}
          onDateRangeChange={handleDateRangeChange}
        />

        <AdminTransactionTable
          transactions={transactions}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
          onReverse={handleReverseTransaction}
          onRequestReversal={handleRequestReversal}
          userRole={userRole}
        />
      </Card>
    </div>
  );
}
