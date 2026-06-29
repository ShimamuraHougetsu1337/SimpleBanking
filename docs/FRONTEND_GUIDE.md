# Frontend Guide — Simple Banking App

## Frontend Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | v18+ | UI Framework |
| TypeScript | v5+ | Type Safety |
| Vite | v5+ | Build Tool & Development Server |
| Ant Design (antd) | v5+ | UI Component Library |
| Zustand | v4+ | Client State Management (Auth, UI) |
| React Query (TanStack) | v5 | Server State Management |
| Axios | v1+ | HTTP Client |
| React Router DOM | v6+ | Client-side Routing |

---

## Folder Structure

```
frontend/src/
├── pages/                          # Page-level components (route targets)
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx           # Balance & summaries
│   ├── TransferPage.tsx            # Money transfer form
│   ├── TransactionsPage.tsx        # Transaction history
│   └── admin/
│       ├── AdminUsersPage.tsx      # User management table (admin only)
│       └── AdminTransactionsPage.tsx
│
├── components/                     # Reusable components
│   ├── layout/
│   │   ├── AppLayout.tsx           # Customer layout (Sidebar + Header)
│   │   └── AdminLayout.tsx         # Admin-specific layout
│   ├── ProtectedRoute.tsx          # Authentication redirect guard
│   ├── AdminRoute.tsx              # Admin role redirect guard
│   ├── TransactionTable.tsx        # Reusable transaction list table
│   └── BalanceCard.tsx             # Balance indicator
│
├── services/                       # API integration modules
│   ├── api.ts                      # Axios configuration & interceptors
│   ├── auth.service.ts
│   ├── account.service.ts
│   └── transaction.service.ts
│
├── store/                          # Zustand stores
│   ├── auth.store.ts               # user, tokens, isAuthenticated status
│   └── ui.store.ts                 # Modal toggles, global loaders
│
├── hooks/                          # React Query custom hooks
│   ├── useAccount.ts
│   ├── useTransactions.ts
│   ├── useTransfer.ts
│   └── admin/
│       ├── useAdminUsers.ts
│       └── useAdminTransactions.ts
│
├── types/                          # TypeScript type definitions
│   ├── user.types.ts
│   ├── account.types.ts
│   └── transaction.types.ts
│
├── utils/
│   ├── currency.ts                 # VND formatter
│   ├── error.ts                    # Axios error parser
│   └── idempotency.ts              # UUID generator
│
├── App.tsx                         # Client router definition
└── main.tsx                        # Entry point + React Query provider
```

---

## Routing Configuration

```typescript
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AppLayout } from './components/layout/AppLayout';
import { AdminLayout } from './components/layout/AdminLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected customer routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="transfer" element={<TransferPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
        </Route>

        {/* Admin-only routes */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="transactions" element={<AdminTransactionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

## State Management Strategy

### Zustand — Client State

Used exclusively for non-server local state:

```typescript
// store/auth.store.ts — See details in the react-api-layer skill
// Stores: user details, accessToken, refreshToken

// store/ui.store.ts
import { create } from 'zustand';

interface UiState {
  isTransferModalOpen: boolean;
  openTransferModal: () => void;
  closeTransferModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isTransferModalOpen: false,
  openTransferModal: () => set({ isTransferModalOpen: true }),
  closeTransferModal: () => set({ isTransferModalOpen: false }),
}));
```

### React Query — Server State

Used for all asynchronous remote requests:

| Use Case | Hook | Stale Time |
|---|---|---|
| Current balance & details | `useAccount()` | 30 seconds |
| Transaction list history | `useTransactions(params)` | 0 (Always refetch on mount) |
| User list (admin view) | `useAdminUsers(params)` | 60 seconds |
| Transfer money action | `useTransfer()` (Mutation) | N/A |

**Key Rule**: On mutation success, trigger `invalidateQueries` to refetch relevant data.

---

## Ant Design Usage Guide

### Form Integration — Money Transfer

```tsx
// TransferPage.tsx
import { Form, Input, Button, Card } from 'antd';
import { useTransfer } from '../hooks/useTransfer';
import { v4 as uuidv4 } from 'uuid';

export function TransferPage() {
  const [form] = Form.useForm();
  const { mutate: transfer, isPending } = useTransfer();

  const handleSubmit = (values: any) => {
    transfer({
      to_account_number: values.to_account_number,
      amount: values.amount,
      description: values.description,
      idempotency_key: uuidv4(), // Generate a unique key for the transaction
    });
  };

  return (
    <Card title="Transfer Money">
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="to_account_number"
          label="Destination Account Number"
          rules={[
            { required: true, message: 'Please enter account number' },
            { pattern: /^VN\d{14}$/, message: 'Account number format is invalid' },
          ]}
        >
          <Input placeholder="VN..." />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount (VND)"
          rules={[
            { required: true, message: 'Please input transfer amount' },
            { pattern: /^\d+(\.\d{1,2})?$/, message: 'Invalid decimal representation' },
            { validator: (_, value) => Number(value) > 0
                ? Promise.resolve()
                : Promise.reject('Amount must be greater than 0') },
          ]}
        >
          <Input placeholder="500000" suffix="VND" />
        </Form.Item>

        <Form.Item name="description" label="Message (Optional)">
          <Input.TextArea maxLength={255} showCount />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={isPending}  // Disable & load during async operation
          block
        >
          Confirm Transfer
        </Button>
      </Form>
    </Card>
  );
}
```

### Table Integration — Paginated Transaction History

```tsx
// TransactionsPage.tsx
import { Table, Tag, Typography } from 'antd';
import { useTransactions } from '../hooks/useTransactions';
import { formatVND } from '../utils/currency';

export function TransactionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransactions({ page, limit: 10 });

  const columns = [
    {
      title: 'Date & Time',
      dataIndex: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('vi-VN'),
    },
    {
      title: 'Type',
      dataIndex: 'direction',
      render: (dir: string) => (
        <Tag color={dir === 'credit' ? 'green' : 'red'}>
          {dir === 'credit' ? 'Incoming' : 'Outgoing'}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (amount: string, record: any) => (
        <Typography.Text type={record.direction === 'credit' ? 'success' : 'danger'}>
          {record.direction === 'credit' ? '+' : '-'}{formatVND(amount)}
        </Typography.Text>
      ),
    },
    { title: 'Counterpart Owner', dataIndex: 'counterpart_name' },
    { title: 'Message', dataIndex: 'description' },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data?.data}
      loading={isLoading}
      rowKey="id"
      pagination={{
        current: page,
        pageSize: 10,
        total: data?.meta.total,
        onChange: setPage,  // Server-side pagination callback
        showSizeChanger: false,
      }}
    />
  );
}
```

### Value Display Component — Balance Card

```tsx
// BalanceCard.tsx
import { Card, Statistic, Spin } from 'antd';
import { useAccount } from '../hooks/useAccount';
import { formatVND } from '../utils/currency';

export function BalanceCard() {
  const { data: account, isLoading } = useAccount();

  return (
    <Card>
      <Spin spinning={isLoading}>
        <Statistic
          title="Account Balance"
          value={account?.balance ?? 0}
          formatter={(value) => formatVND(String(value))}
          suffix="VND"
        />
        <div style={{ marginTop: 8 }}>Account Number: {account?.account_number}</div>
      </Spin>
    </Card>
  );
}
```

---

## Utility Functions

```typescript
// utils/currency.ts
export function formatVND(amount: string | number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(amount));
}

// utils/idempotency.ts
import { v4 as uuidv4 } from 'uuid';
export function generateIdempotencyKey(): string {
  return uuidv4();
}

// utils/error.ts
export function getErrorMessage(error: unknown): string {
  const axiosError = error as any;
  if (axiosError?.response?.data?.message) {
    const msg = axiosError.response.data.message;
    return Array.isArray(msg) ? msg.join(', ') : msg;
  }
  return 'An error occurred, please try again';
}
```

---

## Environment Configuration

```env
# frontend/.env
VITE_API_BASE_URL=http://localhost:3000/api
```

Exposed in Vite context: `import.meta.env.VITE_API_BASE_URL`
