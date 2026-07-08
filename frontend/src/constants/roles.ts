export const UserRole = {
  CUSTOMER: 'customer',
  TELLER: 'teller',
  MANAGER: 'manager',
  SUPERADMIN: 'superadmin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
