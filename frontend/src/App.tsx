import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/customer/DashboardPage';
import AccountsPage from './pages/customer/AccountsPage';
import TransferPage from './pages/customer/TransferPage';
import TransactionsPage from './pages/customer/TransactionsPage';

import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminAccountsPage from './pages/admin/AdminAccountsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import MaintenancePage from './pages/MaintenancePage';

import { AppLayout } from './components/layout/AppLayout';
import { AdminLayout } from './components/layout/AdminLayout';

import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'accounts/:id', element: <AccountDetailPage /> },
      { path: 'transfer', element: <TransferPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'accounts', element: <AdminAccountsPage /> },
      { path: 'transactions', element: <AdminTransactionsPage /> },
      { path: 'settings', element: <AdminSettingsPage /> },
    ],
  },
  {
    path: '/maintenance',
    element: <MaintenancePage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  }
]);

import { App as AntApp } from 'antd';
import AccountDetailPage from './pages/customer/AccountDetailPage';
import SettingsPage from './pages/customer/SettingsPage';
import { AuthProvider } from './components/AuthProvider';

export default function App() {
  return (
    <AntApp>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AntApp>
  );
}
