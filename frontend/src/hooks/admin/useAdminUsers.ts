import { useAdminUsersQuery } from './useAdminUsersQuery';
import { useAdminUsersActions } from './useAdminUsersActions';
import type { AdminUser } from '@/types/admin';

export function useAdminUsers() {
  const queryData = useAdminUsersQuery();
  const actionData = useAdminUsersActions();

  return {
    ...queryData,
    ...actionData,
  };
}

export type { AdminUser };
