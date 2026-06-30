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
    await api.post('/auth/logout');
    useAuthStore.getState().clearAuth();
  },

  async getCurrentUser() {
    const { data } = await api.get('/users/me');
    return data;
  },
};
