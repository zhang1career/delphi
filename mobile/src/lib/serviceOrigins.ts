import {
  apiConfigAccessKey,
  apiConfigPublicKey,
  apiConfigPublicUrl,
  cdnDistributionId,
  webDevGatewayProxyOrigin,
} from "@/lib/config";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { Platform } from "react-native";
import { WEB_DEV_CONFIG_PROXY_PATH } from "../../devConfigProxyPath.js";
import { WEB_DEV_GATEWAY_PROXY_PATH } from "../../devGatewayProxyPath.js";

type ConfigHostEnvelope = {
  errorCode?: number;
  message?: string;
  data?: {
    value?: {
      host?: unknown;
    };
  };
};

export type ServiceOrigins = {
  host: string;
  userAggBaseUrl: string;
  mallAggBaseUrl: string;
  mallCdnBaseUrl: string;
};

let cachedOrigins: ServiceOrigins | null = null;
let initPromise: Promise<ServiceOrigins> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const HOST_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

/** Mall CDN path prefix on API gateway; distribution id from `CDN_DISTRIBUTION_ID`. */
const MALL_CDN_PATH_PREFIX = "/api/cdn/2020-05-31/d";

function requiredEnv(name: string, value: string): string {
  if (!value) {
    throw new Error(`Missing ${name} in env`);
  }
  return value;
}

/** API gateway behind nginx on port 80; origin omits default HTTP port. */
function gatewayHttpOrigin(host: string): string {
  const h = host.trim().replace(/\/$/, "");
  if (!h) {
    throw new Error("Empty config host");
  }
  return `http://${h}`;
}

function isWebDevUsingMetroProxy(): boolean {
  return (
    Platform.OS === "web" &&
    typeof __DEV__ !== "undefined" &&
    __DEV__ === true &&
    typeof window !== "undefined" &&
    typeof window.location?.origin === "string"
  );
}

function normalizeHttpOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

/** Metro proxies `/__expo_dev_gateway_proxy__/*` to this origin when set and matches config gateway base (Web dev only). */
function shouldUseWebDevGatewayProxy(gatewayBase: string): boolean {
  if (!isWebDevUsingMetroProxy()) {
    return false;
  }
  const configured = webDevGatewayProxyOrigin.trim();
  if (!configured) {
    return false;
  }
  return normalizeHttpOrigin(gatewayBase) === normalizeHttpOrigin(configured);
}

async function fetchConfigHost(): Promise<string> {
  const useDevProxy = isWebDevUsingMetroProxy();
  const baseUrl = useDevProxy
    ? `${window.location.origin}${WEB_DEV_CONFIG_PROXY_PATH}`
    : requiredEnv("API_CONFIG_PUBLIC_URL", apiConfigPublicUrl);
  const accessKey = useDevProxy ? "" : requiredEnv("API_CONFIG_ACCESS_KEY", apiConfigAccessKey);
  const key = useDevProxy ? "" : requiredEnv("API_CONFIG_PUBLIC_KEY", apiConfigPublicKey);
  console.log("[serviceOrigins] request config host", { url: baseUrl, useDevProxy });
  const res = await fetchWithHttpDebug(baseUrl, {
    method: "GET",
    ...(useDevProxy
      ? {}
      : {
          headers: {
            "X-Config-Access-Key": requiredEnv("API_CONFIG_ACCESS_KEY", apiConfigAccessKey),
            "X-Config-Key": requiredEnv("API_CONFIG_PUBLIC_KEY", apiConfigPublicKey),
          },
        }),
  });
  if (!res.ok) {
    throw new Error(`Config API failed: HTTP ${res.status}`);
  }
  const payload = (await res.json()) as ConfigHostEnvelope;
  if (payload.errorCode !== 0) {
    throw new Error(payload.message?.trim() || `Config API failed: errorCode ${String(payload.errorCode)}`);
  }
  const hostRaw = payload.data?.value?.host;
  if (typeof hostRaw !== "string" || hostRaw.trim() === "") {
    throw new Error("Config API response missing data.value.host");
  }
  const host = hostRaw.trim();
  console.log("[serviceOrigins] config host resolved", { host });
  return host;
}

async function createOrigins(): Promise<ServiceOrigins> {
  const host = await fetchConfigHost();
  const gatewayBase = gatewayHttpOrigin(host);
  const cdnDist = requiredEnv("CDN_DISTRIBUTION_ID", cdnDistributionId);

  const useGatewayProxy = shouldUseWebDevGatewayProxy(gatewayBase);
  if (isWebDevUsingMetroProxy() && webDevGatewayProxyOrigin.trim() && !useGatewayProxy) {
    console.warn(
      "[serviceOrigins] WEB_DEV_GATEWAY_PROXY_ORIGIN does not match config gateway base; direct gateway URLs may hit CORS on Web.",
      { gatewayBase, webDevGatewayProxyOrigin },
    );
  }
  if (useGatewayProxy && typeof window !== "undefined") {
    const proxyRoot = `${window.location.origin}${WEB_DEV_GATEWAY_PROXY_PATH}`;
    console.log("[serviceOrigins] web dev gateway proxy (same-origin to Metro)", { gatewayBase, proxyRoot });
    return {
      host,
      userAggBaseUrl: proxyRoot,
      mallAggBaseUrl: proxyRoot,
      mallCdnBaseUrl: `${proxyRoot}${MALL_CDN_PATH_PREFIX}/${cdnDist}`,
    };
  }

  return {
    host,
    userAggBaseUrl: gatewayBase,
    mallAggBaseUrl: gatewayBase,
    mallCdnBaseUrl: `${gatewayBase}${MALL_CDN_PATH_PREFIX}/${cdnDist}`,
  };
}

function ensureRefreshTimer() {
  if (refreshTimer) {
    return;
  }
  console.log("[serviceOrigins] start refresh timer", { intervalMs: HOST_REFRESH_INTERVAL_MS });
  refreshTimer = setInterval(() => {
    console.log("[serviceOrigins] refresh host start");
    createOrigins()
      .then((origins) => {
        cachedOrigins = origins;
        console.log("[serviceOrigins] refresh host success", { host: origins.host });
      })
      .catch((err) => {
        console.error("[serviceOrigins] refresh host failed", err);
      });
  }, HOST_REFRESH_INTERVAL_MS);
}

export function getServiceOriginsSync(): ServiceOrigins | null {
  return cachedOrigins;
}

export async function getServiceOrigins(): Promise<ServiceOrigins> {
  if (cachedOrigins) {
    return cachedOrigins;
  }
  console.log("[serviceOrigins] cache miss, resolve origins");
  if (!initPromise) {
    initPromise = createOrigins()
      .then((origins) => {
        cachedOrigins = origins;
        ensureRefreshTimer();
        return origins;
      })
      .finally(() => {
        initPromise = null;
      });
  }
  return initPromise;
}

export async function initServiceOrigins(): Promise<ServiceOrigins> {
  const origins = await getServiceOrigins();
  ensureRefreshTimer();
  return origins;
}
