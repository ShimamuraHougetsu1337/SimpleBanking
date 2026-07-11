import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/constants/queryKeys';
import type { GetAuditLogsParams, GetAdminAuditLogsResponse, GetCustomerAuditLogsResponse } from '@/services/admin.service';

export function useAuditLogs(activeTab: string, params: GetAuditLogsParams) {
  return useQuery<GetAdminAuditLogsResponse | GetCustomerAuditLogsResponse>({
    queryKey: queryKeys.admin.auditLogs.list(activeTab, params),
    queryFn: () => {
      if (activeTab === 'admin') {
        return adminService.getAdminAuditLogs(params);
      } else {
        return adminService.getCustomerAuditLogs(params);
      }
    },
    placeholderData: (previousData: GetAdminAuditLogsResponse | GetCustomerAuditLogsResponse | undefined) => previousData,
  });
}
