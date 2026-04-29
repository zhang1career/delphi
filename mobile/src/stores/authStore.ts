import { create } from "zustand";

import type { AuthUser, LoginSession } from "@/lib/api/authTypes";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  signIn: (session: LoginSession) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  signIn: (session) =>
    set({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    }),
  signOut: () => set({ accessToken: null, refreshToken: null, user: null }),
}));
