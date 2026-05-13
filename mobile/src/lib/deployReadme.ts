import Constants from "expo-constants";

/**
 * Resolved from `experiments.baseUrl` in `app.config.js` (`WEB_BASE_PATH`), without trailing slash.
 */
export function deployReadmePublicBase(): string {
  const raw = (Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl;
  return typeof raw === "string" ? raw.replace(/\/$/, "") : "";
}

/**
 * Paths to try in order when loading `public/readme.txt`
 * (`/readme` nginx alias vs `/readme.txt` static file vs dev root `/readme.txt`).
 */
export function deployReadmeFetchUrls(): string[] {
  const base = deployReadmePublicBase();
  const list: string[] = [];
  if (base) {
    list.push(`${base}/readme`);
    list.push(`${base}/readme.txt`);
  } else {
    list.push("/readme");
    list.push("/readme.txt");
  }
  return [...new Set(list)];
}

export async function fetchDeployReadmeText(signal?: AbortSignal): Promise<string> {
  let lastStatus = 0;
  for (const url of deployReadmeFetchUrls()) {
    const res = await fetch(url, {
      signal,
      headers: { Accept: "text/plain,*/*;q=0.8" },
      cache: "default",
    });
    if (res.ok) {
      return res.text();
    }
    lastStatus = res.status;
  }
  throw new Error(lastStatus !== 0 ? `HTTP ${String(lastStatus)}` : "No readme URL succeeded");
}
