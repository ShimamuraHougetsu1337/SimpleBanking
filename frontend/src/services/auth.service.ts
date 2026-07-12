import api from './api';
import { useAuthStore } from '@/store/auth.store';

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    return data; // returns: { accessToken, user }
  },

  async register(fullName: string, email: string, password: string) {
    const { data } = await api.post('/auth/register', { fullName, email, password });
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error: any) {
      // If token is already expired or invalid (401), we still want to clear local state
      // and treat it as a successful logout from the user's perspective.
      if (error.response?.status !== 401) {
        throw error;
      }
    } finally {
      useAuthStore.getState().clearAuth();
    }
  },

  async getCurrentUser() {
    const { data } = await api.get('/users/me');
    return data;
  },

  async updateProfile(fullName: string, phoneNumber?: string) {
    const { data } = await api.patch('/users/me/profile', { fullName, phoneNumber });
    return data;
  },

  async changePassword(payload: Record<string, string>) {
    const { data } = await api.patch('/users/me/password', payload);
    return data;
  },
};
