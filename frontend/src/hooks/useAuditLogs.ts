import { useState, useCallback } from 'react';
import { adminService } from '@/services/admin.service';
import type { AdminAuditLog, CustomerAuditLog, GetAuditLogsParams } from '@/services/admin.service';

export function useAuditLogs() {
  const [adminLogs, setAdminLogs] = useState<AdminAuditLog[]>([]);
  const [customerLogs, setCustomerLogs] = useState<CustomerAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const fetchAdminLogs = useCallback(async (params?: GetAuditLogsParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getAdminAuditLogs(params);
      setAdminLogs(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch admin audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomerLogs = useCallback(async (params?: GetAuditLogsParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getCustomerAuditLogs(params);
      setCustomerLogs(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch customer audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    adminLogs,
    customerLogs,
    loading,
    error,
    meta,
    fetchAdminLogs,
    fetchCustomerLogs,
  };
}
