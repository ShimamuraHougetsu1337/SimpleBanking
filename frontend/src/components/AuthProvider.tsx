import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import axios from 'axios';
import { Spin } from 'antd';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const initAuth = async () => {
      // If already authenticated in memory, skip refresh
      if (isAuthenticated) {
        setIsInitializing(false);
        return;
      }

      try {
        // Attempt to refresh the token using the HttpOnly cookie
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Restore session state
        setAuth(data.user, data.accessToken);
      } catch {
        // Silent failure - user just stays logged out
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, [isAuthenticated, setAuth]);

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <Spin size="large" description="Loading application..." />
      </div>
    );
  }

  return <>{children}</>;
}
