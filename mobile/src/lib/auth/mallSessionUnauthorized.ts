import { router } from "expo-router";
import {
  type MallApiEnvelope,
  normalizeMallErrorCode,
} from "@/lib/api/mallEnvelope";
import { clearSession } from "@/lib/auth/sessionLifecycle";
import {
  MALL_BUSINESS_CODE_UNAUTHORIZED,
  buildLoginHref,
  getTrackedReturnHref,
} from "@/lib/auth/postLoginReturn";

export class MallUnauthorizedRedirectError extends Error {
  constructor() {
    super("Session expired; sign in again.");
    this.name = "MallUnauthorizedRedirectError";
  }
}

/**
 * When the gateway returns HTTP 401 and the mall envelope `errorCode` is
 * {@link MALL_BUSINESS_CODE_UNAUTHORIZED}, send the user to sign-in and return
 * to the last tracked route after success.
 */
export function redirectIfMallSessionUnauthorized(
  res: Response,
  env: MallApiEnvelope,
): boolean {
  if (res.status !== 401) {
    return false;
  }
  if (normalizeMallErrorCode(env) !== MALL_BUSINESS_CODE_UNAUTHORIZED) {
    return false;
  }
  void clearSession();
  router.replace(buildLoginHref(String(getTrackedReturnHref())));
  return true;
}
