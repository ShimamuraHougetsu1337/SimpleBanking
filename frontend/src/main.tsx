import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import App from './App.tsx';
import './style.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#3B82F6',
            colorSuccess: '#10B981',
            colorError: '#EF4444',
            colorBgBase: '#F8FAFC',
            borderRadius: 12,
            fontFamily: '"Inter", "Roboto", sans-serif',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
          components: {
            Layout: {
              bodyBg: '#F8FAFC',
              headerBg: '#FFFFFF',
              siderBg: '#FFFFFF',
            },
            Card: {
              boxShadowTertiary: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            },
            Menu: {
              itemHeight: 56,
              itemMarginInline: 12,
              itemMarginBlock: 8,
              fontSize: 16,
              iconSize: 20,
              itemHoverBg: '#F1F5F9',
              itemBorderRadius: 8,
            }
          }
        }}
      >
        <App />
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
