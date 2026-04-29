import { jsonBearerHeaders } from "./bearerRequestHeaders";
import { useAuthStore } from "@/stores/authStore";

/**
 * Headers for authenticated `/api/mall-agg/*` requests (catalog, orders, checkout, points):
 * `Authorization: Bearer <access_token>` from `LoginSession.accessToken`.
 */
export function mallAggBearerHeaders(overrides?: Record<string, string>): HeadersInit {
  const token = useAuthStore.getState().accessToken?.trim();
  if (!token) {
    throw new Error("Missing access token; sign in required for mall-agg requests");
  }
  return jsonBearerHeaders(token, overrides);
}

/** Same as {@link mallAggBearerHeaders} with `Content-Type: application/json` for request bodies. */
export function mallAggJsonBearerHeaders(overrides?: Record<string, string>): HeadersInit {
  return mallAggBearerHeaders({
    "Content-Type": "application/json",
    ...overrides,
  });
}
