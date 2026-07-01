import { create } from 'zustand';

export interface User {
  id: string;
  full_name: string;
  fullName?: string;
  email: string;
  role: 'customer' | 'admin';
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
  isAdmin: () => get().user?.role === 'admin',
}));
