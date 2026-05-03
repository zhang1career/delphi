import { getServiceOriginsSync } from "@/lib/serviceOrigins";

/** API `banner` / `main_media` keys are stored under OSS path `bet/{key}`. */
function betObjectKeyForCdn(relativeKey: string): string {
  const n = relativeKey.replace(/^\/+/, "");
  if (n.startsWith("bet/") || n === "bet") {
    return n;
  }
  return `bet/${n}`;
}

/**
 * Full CDN URL for a game asset using the **configured** `mallCdnBaseUrl` (e.g. gateway
 * `/api/cdn/2020-05-31/d/{distributionId}`). Call this after `await getServiceOrigins()` so Web
 * gets the same base that served `GET /api/bet/games` (avoids relying only on sync cache).
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
  return `${b}/${betObjectKeyForCdn(t)}`;
}

/**
 * Same as {@link betGameAssetCdnUriWithBase} using `getServiceOriginsSync().mallCdnBaseUrl` when the
 * app has already resolved service origins.
 */
export function betGameAssetCdnUri(assetRef: string | undefined | null): string | null {
  const base = (getServiceOriginsSync()?.mallCdnBaseUrl ?? "").replace(/\/$/, "");
  return betGameAssetCdnUriWithBase(base, assetRef);
}
