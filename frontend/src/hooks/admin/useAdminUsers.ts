import { useState, useMemo } from 'react';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  balance: string;
  created_at: string;
}

// Mock Data
const mockUsers: AdminUser[] = [
  {
    id: 'u-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'customer',
    status: 'active',
    balance: '24500000',
    created_at: '2026-01-15T10:30:00Z',
  },
  {
    id: 'u-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'customer',
    status: 'active',
    balance: '1500000',
    created_at: '2026-03-22T14:15:00Z',
  },
  {
    id: 'u-3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: 'customer',
    status: 'locked',
    balance: '500000',
    created_at: '2026-05-10T09:45:00Z',
  },
  {
    id: 'u-4',
    name: 'Admin System',
    email: 'admin@simplebank.com',
    role: 'admin',
    status: 'active',
    balance: '0',
    created_at: '2025-12-01T08:00:00Z',
  },
];

export function useAdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return mockUsers;
    const lowerQuery = searchQuery.toLowerCase();
    return mockUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1); // Reset to first page on new search
  };

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
  };

  const handleLockUser = (userId: string) => {
    console.log('Lock user', userId);
  };

  const handleUnlockUser = (userId: string) => {
    console.log('Unlock user', userId);
  };

  return {
    users: filteredUsers,
    total: filteredUsers.length,
    page,
    pageSize,
    searchQuery,
    handleSearchChange,
    handlePageChange,
    handleLockUser,
    handleUnlockUser,
    stats: {
      totalUsers: 1254,
      activeAccounts: 1180,
      lockedAccounts: 74,
    },
  };
}
