import { useAuthStore } from "@/stores/authStore";

/**
 * Authenticated bet routes on the API gateway: `Authorization: Bearer <access_token>`
 * (same JWT as mall-agg). The gateway translates to internal headers for downstream services.
 */
export function betAggUserAccessHeaders(overrides?: Record<string, string>): HeadersInit {
  const token = useAuthStore.getState().accessToken?.trim();
  if (!token) {
    throw new Error("Missing access token; sign in required for bet order APIs");
  }
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
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
