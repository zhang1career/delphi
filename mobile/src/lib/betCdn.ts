import { getServiceOriginsSync } from "@/lib/serviceOrigins";

/** Normalize API relative object key: strip leading slashes (same as mall product thumbnails). */
function cdnObjectKeySegment(relativeKey: string): string {
  return relativeKey.replace(/^\/+/, "");
}

/**
 * Full CDN URL for a game asset using the **configured** `mallCdnBaseUrl` (e.g. gateway
 * `/api/cdn/2020-05-31/d/{distributionId}`). Relative keys are appended as returned by the API
 * (no extra `bet/` segment). Call this after `await getServiceOrigins()` so Web gets the same base
 * that served `GET /api/bet/games` (avoids relying only on sync cache).
 */
export function betGameAssetCdnUriWithBase(cdnBase: string, assetRef: string | undefined | null): string | null {
  const t = typeof assetRef === "string" ? assetRef.trim() : "";
  if (!t) {
    return null;
  }
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  const b = cdnBase.replace(/\/$/, "");
  if (!b) {
    return null;
  }
  return `${b}/${cdnObjectKeySegment(t)}`;
}

/**
 * Same as {@link betGameAssetCdnUriWithBase} using `getServiceOriginsSync().mallCdnBaseUrl` when the
 * app has already resolved service origins.
 */
export function betGameAssetCdnUri(assetRef: string | undefined | null): string | null {
  const base = (getServiceOriginsSync()?.mallCdnBaseUrl ?? "").replace(/\/$/, "");
  return betGameAssetCdnUriWithBase(base, assetRef);
}
