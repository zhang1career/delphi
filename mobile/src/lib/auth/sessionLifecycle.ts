import type { LoginSession } from "@/lib/api/authTypes";
import { clearAuthTokens, persistAuthTokens } from "@/lib/auth/secureTokenStore";
import { useAuthStore } from "@/stores/authStore";

/** Updates in-memory session and persists access/refresh tokens (not user). */
export async function applySession(session: LoginSession): Promise<void> {
  useAuthStore.getState().signIn(session);
  await persistAuthTokens({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
  });
}

/** Clears session memory and secure token storage. */
export async function clearSession(): Promise<void> {
  useAuthStore.getState().signOut();
  await clearAuthTokens();
}
