import { create } from 'zustand';

type AuthState = {
  isLoggedIn: boolean;
  user: any | null;
  setUser: (user: any | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  user: null,
  setUser: (user) =>
    set({
      user,
      isLoggedIn: !!user,
    }),
}));
