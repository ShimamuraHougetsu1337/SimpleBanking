import { create } from 'zustand';
import { UserRole } from '@/constants/roles';

export interface User {
  id: string;
  full_name: string;
  fullName?: string;
  email: string;
  role: UserRole;
  status: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,

  setAuth: (user, accessToken) => {
    set({ user, accessToken });
  },

  setAccessToken: (token) => set({ accessToken: token }),

  clearAuth: () => {
    set({ user: null, accessToken: null });
  },

  isAuthenticated: () => !!get().accessToken,
  isAdmin: () => {
    const role = get().user?.role;
    return role === UserRole.TELLER || role === UserRole.MANAGER || role === UserRole.SUPERADMIN;
  },
}));
