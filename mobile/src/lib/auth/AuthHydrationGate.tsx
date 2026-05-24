import { useEffect, useState, type ReactNode } from "react";
import { Platform, Text, View, type ViewStyle } from "react-native";
import { refreshSessionWithRefreshToken } from "@/lib/api/login";
import { applySession, clearSession } from "@/lib/auth/sessionLifecycle";
import { loadPersistedTokens } from "@/lib/auth/secureTokenStore";

type AuthHydrationGateProps = {
  children: ReactNode;
};

/**
 * Restores tokens from secure storage on cold start, refreshes for a full
 * {@link LoginSession} (requires `data.user` on refresh when none is cached).
 */
export function AuthHydrationGate({ children }: AuthHydrationGateProps) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tokens = await loadPersistedTokens();
        if (tokens == null) {
          return;
        }
        const session = await refreshSessionWithRefreshToken(tokens.refreshToken, tokens.user);
        if (cancelled) {
          return;
        }
        await applySession(session);
      } catch {
        if (!cancelled) {
          await clearSession();
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f172a",
          justifyContent: "center",
          alignItems: "center",
          ...(Platform.OS === "web"
            ? ({ minHeight: "100vh" } as unknown as ViewStyle)
            : {}),
        }}
      >
        <Text style={{ color: "#94a3b8", fontSize: 16 }}>登陆中...</Text>
      </View>
    );
  }

  return <>{children}</>;
}
