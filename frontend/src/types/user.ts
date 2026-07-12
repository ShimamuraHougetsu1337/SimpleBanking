import { UserRole } from '@/constants/roles';

export interface User {
  id: string;
  full_name: string;
  fullName?: string;
  email: string;
  role: UserRole;
  status: string;
  phoneNumber?: string;
  phone_number?: string;
}
