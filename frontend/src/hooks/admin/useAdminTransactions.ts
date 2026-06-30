import { useState, useMemo } from 'react';

export interface AdminTransaction {
  id: string;
  created_at: string;
  sender_name: string;
  receiver_name: string;
  amount: string;
  status: string;
  type: string;
}

const INITIAL_MOCK_TRANSACTIONS: AdminTransaction[] = [
  {
    id: 'tx-1001',
    created_at: '2026-06-29T10:30:00Z',
    sender_name: 'System',
    receiver_name: 'John Doe',
    amount: '1500000',
    status: 'completed',
    type: 'deposit',
  },
  {
    id: 'tx-1002',
    created_at: '2026-06-28T15:45:00Z',
    sender_name: 'John Doe',
    receiver_name: 'Starbucks (Merchant)',
    amount: '350000',
    status: 'completed',
    type: 'transfer',
  },
  {
    id: 'tx-1003',
    created_at: '2026-06-27T09:15:00Z',
    sender_name: 'Jane Smith',
    receiver_name: 'John Doe',
    amount: '500000',
    status: 'failed',
    type: 'transfer',
  },
  {
    id: 'tx-1004',
    created_at: '2026-06-26T11:20:00Z',
    sender_name: 'John Doe',
    receiver_name: 'Jane Smith',
    amount: '2000000',
    status: 'completed',
    type: 'transfer',
  },
];

export function useAdminTransactions() {
  const [transactions] = useState<AdminTransaction[]>(INITIAL_MOCK_TRANSACTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter transactions based on inputs
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Search Query
      const lowerQuery = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        tx.id.toLowerCase().includes(lowerQuery) ||
        tx.sender_name.toLowerCase().includes(lowerQuery) ||
        tx.receiver_name.toLowerCase().includes(lowerQuery);

      // 2. Type Filter
      const matchesType = typeFilter === 'all' || tx.type === typeFilter;

      // 3. Date Range Filter
      let matchesDate = true;
      if (dateRange && dateRange[0] && dateRange[1]) {
        const txDate = new Date(tx.created_at);
        const startDate = dateRange[0];
        const endDate = dateRange[1];
        // Set times to cover full day bounds
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = txDate >= startDate && txDate <= endDate;
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [transactions, searchQuery, typeFilter, dateRange]);

  // Dynamically calculate metrics
  const stats = useMemo(() => {
    const completedTxs = transactions.filter((tx) => tx.status === 'completed');
    const totalVolume = completedTxs.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const successfulCount = completedTxs.length;
    const failedCount = transactions.filter((tx) => tx.status === 'failed').length;

    return {
      totalVolume,
      successfulCount,
      failedCount,
    };
  }, [transactions]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1); // Reset page
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setPage(1); // Reset page
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0].toDate(), dates[1].toDate()]);
    } else {
      setDateRange(null);
    }
    setPage(1); // Reset page
  };

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
  };

  return {
    transactions: filteredTransactions,
    total: filteredTransactions.length,
    page,
    pageSize,
    searchQuery,
    typeFilter,
    dateRange,
    handleSearchChange,
    handleTypeFilterChange,
    handleDateRangeChange,
    handlePageChange,
    stats,
  };
}
