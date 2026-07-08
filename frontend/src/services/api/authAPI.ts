import { apiClient } from './apiClient';

export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data.data;
  },

  register: async (userData: { email: string; password: string; name: string }) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data.data;
  },

  updateProfile: async (userData: any) => {
    const response = await apiClient.put('/auth/profile', userData);
    return response.data.data ?? response.data;
  },

  changePassword: async (passwords: { currentPassword: string; newPassword: string }) => {
    const response = await apiClient.put('/auth/password', passwords);
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },
};
