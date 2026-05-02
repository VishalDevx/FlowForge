import { create } from 'zustand';
import { clearTokens } from '../lib/auth';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  setUser: (user) => set({ user }),
  logout: () => {
    clearTokens();
    set({ user: null });
  },
}));
