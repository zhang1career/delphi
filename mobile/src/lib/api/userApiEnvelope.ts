import type { AuthUser, LoginSession } from "@/lib/api/authTypes";

export type UserApiEnvelope = {
  errorCode: number;
  data?: {
    event_id?: number;
    access_token?: string;
    refresh_token?: string;
    user?: AuthUser;
  } | null;
  message?: string;
  detail?: string;
};

export function optionalEventIdFromData(data: UserApiEnvelope["data"]): number | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }
  const id = (data as { event_id?: unknown }).event_id;
  return typeof id === "number" ? id : undefined;
}

export function optionalAccessTokenFromData(data: UserApiEnvelope["data"]): string | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }
  const t = (data as { access_token?: unknown }).access_token;
  return typeof t === "string" && t.trim() ? t : undefined;
}

export function requireEventIdFromData(data: UserApiEnvelope["data"], missingMessage: string): number {
  const id = optionalEventIdFromData(data);
  if (id === undefined) {
    throw new Error(missingMessage);
  }
  return id;
}

export function parseUserApiJson(text: string, res: Response): UserApiEnvelope {
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!body || typeof body !== "object") {
    throw new Error("Invalid response");
  }
  return body as UserApiEnvelope;
}

export function assertUserApiSuccess(env: UserApiEnvelope): void {
  if (env.errorCode !== 0) {
    throw new Error(env.message?.trim() || `Request failed (errorCode ${env.errorCode})`);
  }
}

export function sessionFromEnvelope(env: UserApiEnvelope): LoginSession | null {
  const d = env.data;
  if (!d) return null;
  if (
    typeof d.access_token !== "string" ||
    typeof d.refresh_token !== "string" ||
    !d.user ||
    typeof d.user !== "object"
  ) {
    return null;
  }
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    user: d.user,
  };
}

export function requireSessionFromEnvelope(env: UserApiEnvelope): LoginSession {
  const s = sessionFromEnvelope(env);
  if (!s) {
    throw new Error("Login response missing data");
  }
  return s;
}

/**
 * Like {@link requireSessionFromEnvelope}, but if `data.user` is absent (some refresh endpoints only
 * return new tokens), uses `fallbackUser`.
 */
export function requireSessionFromEnvelopeWithUserFallback(
  env: UserApiEnvelope,
  fallbackUser: AuthUser | null,
): LoginSession {
  const d = env.data;
  if (!d) {
    throw new Error("Login response missing data");
  }
  if (typeof d.access_token !== "string" || typeof d.refresh_token !== "string") {
    throw new Error("Login response missing data");
  }
  const user =
    d.user && typeof d.user === "object" ? d.user : fallbackUser;
  if (!user || typeof user !== "object") {
    throw new Error("Login response missing data");
  }
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    user,
  };
}
