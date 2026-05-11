import type { Href } from "expo-router";

/** Backend session invalid / not allowed (not HTTP 200). */
export const MALL_BUSINESS_CODE_UNAUTHORIZED = 200;

let trackedReturnHref: Href = "/(app)/(tabs)";

/** Latest in-app route for “return after sign-in” (avoids auth group). */
export function updatePostLoginReturnFromSegments(segments: readonly string[]): void {
  if (segments.length === 0) {
    return;
  }
  const joined = `/${segments.join("/")}` as Href;
  if (typeof joined === "string" && joined.startsWith("/(auth)")) {
    return;
  }
  trackedReturnHref = joined;
}

export function getTrackedReturnHref(): Href {
  return trackedReturnHref;
}

export function buildLoginHref(returnHref: string): Href {
  const enc = encodeURIComponent(returnHref);
  return `/(auth)/login?returnTo=${enc}`;
}

/** Parses `returnTo` after login; restricts to `/(app)/` to avoid open redirects. */
export function hrefAfterLoginFromParam(raw: string | string[] | undefined): Href {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string" || v.length === 0) {
    return "/(app)/(tabs)";
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(v);
  } catch {
    return "/(app)/(tabs)";
  }
  if (!decoded.startsWith("/(app)/")) {
    return "/(app)/(tabs)";
  }
  return decoded as Href;
}
