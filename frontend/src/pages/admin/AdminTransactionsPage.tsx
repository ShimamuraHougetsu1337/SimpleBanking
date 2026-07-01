import { Card, Typography, Space, Button } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { useAdminTransactions } from '@/hooks/admin/useAdminTransactions';
import { AdminTransactionStats } from '@/components/admin/transactions/AdminTransactionStats';
import { AdminTransactionFilters } from '@/components/admin/transactions/AdminTransactionFilters';
import { AdminTransactionTable } from '@/components/admin/transactions/AdminTransactionTable';
import { CARD_SHADOW_STYLE } from '@/components/admin/transactions/admin-transactions.constants';

const { Title } = Typography;

export default function AdminTransactionsPage() {
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
    stats,
  } = useAdminTransactions();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>All Transactions</Title>
        <Space>
          <Button icon={<FilterOutlined />}>More Filters</Button>
          <Button type="primary" style={{ borderRadius: 8, height: 40 }}>Export Report</Button>
        </Space>
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
        />
      </Card>
    </div>
  );
}
