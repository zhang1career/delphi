import { getServiceOriginsSync } from "@/lib/serviceOrigins";

function resolveCdnKeyOrAbsoluteUrl(keyOrUrl: string): string | null {
  if (/^https?:\/\//i.test(keyOrUrl)) {
    return keyOrUrl;
  }
  const base = (getServiceOriginsSync()?.mallCdnBaseUrl ?? "").replace(/\/$/, "");
  if (!base) {
    return null;
  }
  return `${base}/${keyOrUrl}`;
}

/** Full image URI: CDN path when `thumbnail` is set, otherwise `imageUrl`. */
export function mallProductImageUri(thumbnail: string | undefined, imageUrl: string): string {
  const t = typeof thumbnail === "string" ? thumbnail.trim() : "";
  if (t) {
    const resolved = resolveCdnKeyOrAbsoluteUrl(t);
    if (resolved) {
      return resolved;
    }
  }
  return imageUrl;
}

/**
 * Resolves a CDN storage key or absolute image URL (e.g. bet game `banner`).
 * Relative keys need `mallCdnBaseUrl`; returns null when missing or unresolvable.
 */
export function mallCdnResolveUri(assetRef: string | undefined | null): string | null {
  const t = typeof assetRef === "string" ? assetRef.trim() : "";
  if (!t) {
    return null;
  }
  return resolveCdnKeyOrAbsoluteUrl(t);
}

/** Resolves each media key like list `thumbnail` (comma-separated segments from API → array). */
export function mallProductImageUriList(keys: string[] | undefined, fallbackImageUrl: string): string[] {
  if (!keys?.length) {
    return [];
  }
  return keys.map((key) => mallProductImageUri(key, fallbackImageUrl));
}
