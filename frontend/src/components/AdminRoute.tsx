import React from 'react';
import { Navigate } from 'react-router-dom';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  // TODO: Implement actual role check with useAuthStore
  const isAdmin = true; 
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}
