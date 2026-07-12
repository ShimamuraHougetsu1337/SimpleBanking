import { useAdminUsersQuery } from './useAdminUsersQuery';
import { useAdminUsersActions } from './useAdminUsersActions';
import type { AdminUser } from '@/services/admin.service';

export function useAdminUsers() {
  const queryData = useAdminUsersQuery();
  const actionData = useAdminUsersActions();

  return {
    ...queryData,
    ...actionData,
  };
}

export type { AdminUser };
