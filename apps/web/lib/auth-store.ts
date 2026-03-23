'use client';
import { create } from 'zustand';
import { api } from '@/lib/api';

interface AuthUser {
  _id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'admin' | 'specialist';
  assignedProjects?: string[];
}

interface AuthAgency {
  _id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: AuthUser | null;
  agency: AuthAgency | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  init: () => Promise<void>;
  login: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  agency: null,
  isLoading: true,
  isAuthenticated: false,

  init: async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        set({ user: res.data.user, agency: res.data.agency, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (credential: string) => {
    const res = await api.loginWithGoogle(credential);
    if (res.success && res.data) {
      api.setToken(res.data.token); // Persists to localStorage
      set({ user: res.data.user, agency: res.data.agency, isAuthenticated: true });
    }
  },

  logout: async () => {
    await api.logout().catch(() => {});
    api.setToken(null); // Clear from localStorage
    set({ user: null, agency: null, isAuthenticated: false });
    window.location.href = '/login';
  },
}));