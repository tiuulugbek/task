import { create } from 'zustand';
import axios from 'axios';

interface User {
  id: string;
  tgId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  authenticateTelegram: (initData: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://task.acoustic.uz/api';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  authenticateTelegram: async (initData: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/telegram/verify`, {
        initData,
      }, {
        withCredentials: true,
      });

      if (response.data.success) {
        await useAuthStore.getState().fetchUser();
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
      set({ user: null, loading: false });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },

  fetchUser: async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        withCredentials: true,
      });

      if (response.data.success) {
        set({ user: response.data.data, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      set({ user: null, loading: false });
    }
  },
}));
