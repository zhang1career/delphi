import type { AuthUser, LoginSession } from "@/lib/api/authTypes";
import { USER_LOGIN_PATH } from "@/lib/api/userApiPaths";
import {
  assertUserApiSuccess,
  parseUserApiJson,
  requireSessionFromEnvelope,
  requireSessionFromEnvelopeWithUserFallback,
} from "@/lib/api/userApiEnvelope";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { getServiceOrigins } from "@/lib/serviceOrigins";

export type { AuthUser, LoginSession } from "@/lib/api/authTypes";

export async function loginWithPassword(loginKey: string, password: string): Promise<LoginSession> {
  const { userAggBaseUrl: base } = await getServiceOrigins();
  const res = await fetchWithHttpDebug(`${base}${USER_LOGIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login_key: loginKey, password }),
  });
  const text = await res.text();
  const env = parseUserApiJson(text, res);
  assertUserApiSuccess(env);
  return requireSessionFromEnvelope(env);
}

/**
 * `PUT .../api/user-agg/login` with `{ refresh_token }`.
 * Pass `existingUser` so a token-only refresh response can still build a full session.
 */
export async function refreshSessionWithRefreshToken(
  refreshToken: string,
  existingUser: AuthUser | null,
): Promise<LoginSession> {
  const { userAggBaseUrl: base } = await getServiceOrigins();
  const res = await fetchWithHttpDebug(`${base}${USER_LOGIN_PATH}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const text = await res.text();
  const env = parseUserApiJson(text, res);
  assertUserApiSuccess(env);
  return requireSessionFromEnvelopeWithUserFallback(env, existingUser);
}
