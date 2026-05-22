import {
  apiConfigAccessKey,
  apiConfigPublicKey,
  apiConfigPublicUrl,
} from "@/lib/config";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { useAuthStore } from "@/stores/authStore";
import { Platform } from "react-native";
import { WEB_DEV_CONFIG_PROXY_PATH } from "../../../devConfigProxyPath.js";
import { WEB_DEV_CONFIG_PRI_PROXY_PATH } from "../../../devConfigPriProxyPath.js";

/** Config center entry key for app runtime data (e.g. home banner `group_code`). */
export const APP_DATA_CONFIG_KEY = "data";

type ConfigEnvelope = {
  errorCode?: number;
  message?: string;
  data?: {
    value?: unknown;
  };
};

type AppDataConfigValue = {
  banners?: {
    code?: unknown;
  };
};

function requiredEnv(name: string, value: string): string {
  if (!value) {
    throw new Error(`Missing ${name} in env`);
  }
  return value;
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

function configPriBaseUrl(): string {
  const pub = requiredEnv("API_CONFIG_PUBLIC_URL", apiConfigPublicUrl);
  const url = new URL(pub);
  url.pathname = url.pathname.replace(/\/?pub\/?$/, "/pri");
  if (!/\/pri\/?$/.test(url.pathname)) {
    throw new Error("API_CONFIG_PUBLIC_URL must point at /api/config/pub");
  }
  url.search = "";
  return url.toString();
}

function configPriRequestUrl(): string {
  if (isWebDevUsingMetroProxy()) {
    return `${window.location.origin}${WEB_DEV_CONFIG_PRI_PROXY_PATH}`;
  }
  return configPriBaseUrl();
}

function parseConfigValue(raw: unknown): unknown {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed) as unknown;
      } catch {
        return raw;
      }
    }
  }
  return raw;
}

async function parseConfigEnvelope<T>(res: Response, context: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`Config API failed: HTTP ${res.status}`);
  }
  const payload = (await res.json()) as ConfigEnvelope;
  if (payload.errorCode !== 0) {
    throw new Error(payload.message?.trim() || `Config API failed: errorCode ${String(payload.errorCode)}`);
  }
  const value = parseConfigValue(payload.data?.value);
  if (value == null || typeof value !== "object") {
    throw new Error(`Config API response missing data.value (${context})`);
  }
  return value as T;
}

/** `GET /api/config/pub` — existing host contract; do not change call shape. */
export async function fetchPublicConfigValue<T>(): Promise<T> {
  const useDevProxy = isWebDevUsingMetroProxy();
  const url = useDevProxy
    ? `${window.location.origin}${WEB_DEV_CONFIG_PROXY_PATH}`
    : requiredEnv("API_CONFIG_PUBLIC_URL", apiConfigPublicUrl);
  console.log("[configApi] GET pub", { useDevProxy });
  const res = await fetchWithHttpDebug(url, {
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
  return parseConfigEnvelope<T>(res, "GET pub");
}

/** `POST /api/config/pri` — body `{ key }`; requires login headers. */
export async function fetchPrivateConfigValue<T>(
  configEntryKey: string,
  accessToken: string,
  conditions?: Record<string, unknown>,
): Promise<T> {
  const entryKey = configEntryKey.trim();
  const token = accessToken.trim();
  if (!entryKey) {
    throw new Error("Config key is empty");
  }
  if (!token) {
    throw new Error("Not signed in");
  }
  const useDevProxy = isWebDevUsingMetroProxy();
  const url = configPriRequestUrl();
  const body: { key: string; conditions?: Record<string, unknown> } = { key: entryKey };
  if (conditions != null) {
    body.conditions = conditions;
  }
  console.log("[configApi] POST pri", { key: entryKey, useDevProxy });
  const res = await fetchWithHttpDebug(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(useDevProxy
        ? {
            "X-User-Access-Token": token,
            Authorization: `Bearer ${token}`,
          }
        : {
            "X-Config-Access-Key": requiredEnv("API_CONFIG_ACCESS_KEY", apiConfigAccessKey),
            "X-User-Access-Token": token,
            Authorization: `Bearer ${token}`,
          }),
    },
    body: JSON.stringify(body),
  });
  return parseConfigEnvelope<T>(res, `POST pri key=${entryKey}`);
}

/** Reads `banners.code` via `POST /api/config/pri` with `key=data`. */
export async function fetchBannerGroupCode(): Promise<string> {
  const token = useAuthStore.getState().accessToken?.trim();
  if (!token) {
    throw new Error("Not signed in");
  }
  const value = await fetchPrivateConfigValue<AppDataConfigValue>(APP_DATA_CONFIG_KEY, token);
  const code = value.banners?.code;
  if (typeof code !== "string" || code.trim() === "") {
    throw new Error("Config data.banners.code missing or empty");
  }
  const trimmed = code.trim();
  console.log("[configApi] banner group code resolved", { code: trimmed });
  return trimmed;
}
