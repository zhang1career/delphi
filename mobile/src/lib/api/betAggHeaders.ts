import { useAuthStore } from "@/stores/authStore";

/**
 * bet-agg OpenAPI: `X-User-Access-Token` with raw JWT from Foundation auth.
 * If your gateway normalizes `Authorization: Bearer` to this header, you can map it there instead.
 */
export function betAggUserAccessHeaders(overrides?: Record<string, string>): HeadersInit {
  const token = useAuthStore.getState().accessToken?.trim();
  if (!token) {
    throw new Error("Missing access token; sign in required for bet order APIs");
  }
  return {
    Accept: "application/json",
    "X-User-Access-Token": token,
    ...overrides,
  };
}

export function betAggUserAccessJsonHeaders(overrides?: Record<string, string>): HeadersInit {
  return betAggUserAccessHeaders({
    "Content-Type": "application/json",
    ...overrides,
  });
}

/** Public catalog GETs: no user header. */
export function betPublicJsonHeaders(): HeadersInit {
  return {
    Accept: "application/json",
  };
}
