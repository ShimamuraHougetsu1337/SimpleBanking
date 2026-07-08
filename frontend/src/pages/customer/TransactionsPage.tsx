import { useState } from 'react';
import { Card, Typography, Table, ConfigProvider, Pagination } from 'antd';
import { useTransactions } from '@/hooks/customer/useTransactions';
import { useTransactionFilters } from '@/hooks/customer/useTransactionFilters';
import { TransactionFilters } from '@/components/customer/transactions/filters/TransactionFilters';
import type { TransactionRecord } from '@/types/transaction';
import { TransactionDetailModal } from '@/components/customer/transactions/TransactionDetailModal';
import { getTransactionColumns } from '@/components/customer/transactions/TransactionColumns';

const { Title, Text } = Typography;
const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null);

  const {
    draftFilters,
    appliedFilters,
    filterParams,
    isFilterActive,
    handleDateRangeChange,
    handleKeywordChange,
    handleApplyFilters,
    handleResetFilters,
    handleRemoveDateRange,
    handleRemoveKeyword,
  } = useTransactionFilters();

  // Reset to page 1 when filters are applied or reset
  const applyFilters = () => {
    setPage(1);
    handleApplyFilters();
  };

  const resetFilters = () => {
    setPage(1);
    handleResetFilters();
  };

  const removeDateRange = () => { setPage(1); handleRemoveDateRange(); };
  const removeKeyword = () => { setPage(1); handleRemoveKeyword(); };

  const { data, isLoading, isFetching } = useTransactions({
    page,
    limit: PAGE_SIZE,
    ...filterParams,
  });

  const columns = getTransactionColumns((record) => setSelectedTransaction(record));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Lịch sử giao dịch</Title>
        <Text style={{ color: '#64748b', fontSize: 14 }}>
          Xem và tìm kiếm tất cả giao dịch của bạn
        </Text>
      </div>

      {/* Filter bar */}
      <TransactionFilters
        draftFilters={draftFilters}
        appliedFilters={appliedFilters}
        isFilterActive={isFilterActive}
        onDateRangeChange={handleDateRangeChange}
        onKeywordChange={handleKeywordChange}
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        onRemoveDateRange={removeDateRange}
        onRemoveKeyword={removeKeyword}
      />

      {/* Transaction table */}
      <Card variant="borderless" styles={{ body: { padding: 0 } }}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#3B82F6',
              borderRadius: 12,
            },
            components: {
              Table: {
                headerBg: '#f8fafc',
                headerColor: '#64748b',
                headerSplitColor: 'transparent',
                rowHoverBg: '#f8fafc',
                cellPaddingBlock: 16,
                cellPaddingInline: 16,
              },
            },
          }}
        >
          <Table<TransactionRecord>
            dataSource={data?.data ?? []}
            columns={columns}
            rowKey="id"
            loading={isLoading || isFetching}
            onRow={(record) => ({
              onClick: () => setSelectedTransaction(record),
              style: { cursor: 'pointer' },
            })}
            pagination={false}
            locale={{
              emptyText: (
                <div style={{ padding: '48px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                    {isFilterActive ? 'Không tìm thấy giao dịch phù hợp với bộ lọc' : 'Chưa có giao dịch nào'}
                  </Text>
                </div>
              ),
            }}
            style={{ borderRadius: 12, overflow: 'hidden' }}
          />
        </ConfigProvider>
      </Card>

      {/* External Pagination to prevent local slicing */}
      {data?.meta?.total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={data.meta.total}
            onChange={setPage}
            showSizeChanger={false}
          />
        </div>
      )}

      {/* Transaction detail modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}
