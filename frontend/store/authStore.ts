import { create } from 'zustand';
import { authAPI } from '@/lib/api';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  initialized: false,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  initialize: async () => {
    let token: string | null = null;
    set((s) => {
      if (s.initialized) return s;
      token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      return { ...s, isLoading: true };
    });

    try {
      if (!token) {
        set({ initialized: true, isLoading: false, user: null, token: null });
        return;
      }
      set({ token });
      const res = await authAPI.getMe();
      set({ user: res.data, initialized: true, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, initialized: true, isLoading: false });
    }
  },
}));
