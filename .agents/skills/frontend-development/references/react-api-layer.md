---
name: react-api-layer
description: >
  Create the API integration layer for the React frontend application in the Simple Banking App.
  Trigger when: configuring Axios, response interceptors, React Query hooks,
  making request calls from components, token auto refresh handling, or error parsing.
triggers:
  - "API call"
  - "Axios"
  - "interceptor"
  - "React Query"
  - "frontend API call"
  - "useQuery"
  - "useMutation"
  - "token refresh"
  - "401 handling"
  - "server state"
---

# Skill: React API Layer — Axios + React Query + Zustand

## When to Use This Skill

Use this skill when configuring:
- Core Axios configuration instance.
- React Query hooks for client state updates.
- 401 error handling and refresh token exchanges.
- React Query mutations for write methods (POST, PATCH, DELETE).

## 1. Zustand Auth Store Configuration

```typescript
// src/store/auth.store.ts
import { create } from 'zustand';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'customer' | 'admin';
  status: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,

  setAuth: (user, accessToken) => {
    set({ user, accessToken });
  },

  setAccessToken: (token) => set({ accessToken: token }),

  clearAuth: () => {
    set({ user: null, accessToken: null });
  },

  isAuthenticated: () => !!get().accessToken,
  isAdmin: () => get().user?.role === 'admin',
}));
```

## 2. Axios Client Setup with Interceptors

```typescript
// src/services/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Crucial for sending HttpOnly cookies automatically
  timeout: 10000,
});

// Flag and queue to prevent concurrent refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

// REQUEST INTERCEPTOR — Appends the JWT access token to outgoing request headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// RESPONSE INTERCEPTOR — Intercepts 401 Unauthorized errors to trigger automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Trigger refresh if error status is 401, request wasn't already retried, and is not an authentication endpoint
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Enqueue the pending request while a refresh operation is underway
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { clearAuth } = useAuthStore.getState();

      try {
        // The HttpOnly cookie containing the refresh token is sent automatically because of withCredentials: true
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });

        const newAccessToken = data.access_token;

        // Save new authentication credentials to the Zustand store
        useAuthStore.getState().setAccessToken(newAccessToken);

        processQueue(null, newAccessToken);

        // Retry original request with the new access token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuth();
        // Redirect the user to /login instantly, without modals, and pass a state to show message
        window.location.href = '/login?expired=true';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
```

## 3. Module Services Implementation

```typescript
// src/services/auth.service.ts
import api from './api';
import { useAuthStore } from '@/store/auth.store';

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    return data; // returns: { access_token, user }
  },

  async logout() {
    await api.post('/auth/logout');
    useAuthStore.getState().clearAuth();
  },

  async getCurrentUser() {
    const { data } = await api.get('/users/me');
    return data;
  },
};

// src/services/account.service.ts
export const accountService = {
  async getMyAccount() {
    const { data } = await api.get('/accounts/me');
    return data;
  },
};

// src/services/transaction.service.ts
export const transactionService = {
  async transfer(payload: {
    to_account_number: string;
    amount: string;
    description?: string;
    idempotency_key: string;
  }) {
    const { data } = await api.post('/transactions/transfer', payload);
    return data;
  },

  async getTransactions(params: {
    page?: number;
    limit?: number;
    type?: string;
    from_date?: string;
    to_date?: string;
  }) {
    const { data } = await api.get('/transactions', { params });
    return data; // returns: { data: [...], meta: { page, limit, total, total_pages } }
  },
};
```

## 4. React Query Hooks Patterns & Query Key Factory Guidelines

All components and custom hooks **MUST** use the central Query Key Factory defined in `src/constants/queryKeys.ts` to manage all `queryKey` definitions. Hardcoded query keys are strictly forbidden. 

Always prioritize using React Query `useQuery` for fetching data and `useMutation` for executing commands (write requests) over manual `useEffect` state syncing.

```typescript
// src/hooks/useAccount.ts
import { useQuery } from '@tanstack/react-query';
import { accountService } from '@/services/account.service';
import { queryKeys } from '@/constants/queryKeys';

export function useAccount() {
  return useQuery({
    queryKey: queryKeys.accounts.me(),
    queryFn: accountService.getMyAccount,
    staleTime: 30_000, // 30 seconds caching stale time
  });
}

// src/hooks/useTransactions.ts
import { useQuery } from '@tanstack/react-query';
import { transactionService } from '@/services/transaction.service';
import { queryKeys } from '@/constants/queryKeys';

export function useTransactions(params: {
  page: number;
  limit: number;
  type?: string;
}) {
  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => transactionService.getTransactions(params),
    placeholderData: (previousData) => previousData, // Retains old page layout details during page loading
  });
}

// src/hooks/useTransfer.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@/services/transaction.service';
import { queryKeys } from '@/constants/queryKeys';
import { message } from 'antd';

export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionService.transfer,
    onSuccess: () => {
      // Invalidate query caches using queryKeys factory to fetch updated balances and transactions
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      message.success('Money transferred successfully!');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Transfer failed';
      message.error(msg);
    },
  });
}
```

## 5. React Query Provider Setup

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>,
);
```

## 6. Client Route Protection Component

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// src/components/AdminRoute.tsx
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuthStore((s) => ({
    isAuthenticated: s.isAuthenticated(),
    isAdmin: s.isAdmin(),
  }));
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
```

## 7. Global API Error Utility

```typescript
// src/utils/error.ts
export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred';
  const axiosError = error as any;
  if (axiosError.response?.data?.message) {
    const msg = axiosError.response.data.message;
    return Array.isArray(msg) ? msg.join(', ') : msg;
  }
  return 'A network error occurred, please try again';
}
```

## Setup Checklist

- [ ] Verify Axios requests are intercepting and appending Bearer tokens to headers.
- [ ] Verify Axios responses are handling 401 exceptions via refresh token calls.
- [ ] Enforce locking checks so multiple concurrent token refresh invocations queue requests.
- [ ] Make sure Axios uses `withCredentials: true` to automatically pass HttpOnly refresh token cookies.
- [ ] Do NOT call Axios instance methods (`api.post/get/patch`) directly inside components or hooks; always wrap them in a Service helper class/object with descriptive method names.
- [ ] Wrap the main application entry point inside the QueryClientProvider.
- [ ] Ensure all query requests use React Query `useQuery`, and operations use `useMutation` (always prioritize React Query over manual useEffect state fetching).
- [ ] Enforce using the central Query Key Factory (`queryKeys`) for all React Query caching keys; hardcoded string arrays are forbidden.
- [ ] Invalidate relevant query keys on successful mutations to trigger background updates.
- [ ] Enforce route protection using ProtectedRoute or AdminRoute components.
