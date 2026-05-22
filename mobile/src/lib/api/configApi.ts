import {
  apiConfigAccessKey,
  apiConfigPublicKey,
  apiConfigPublicUrl,
} from "@/lib/config";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { Platform } from "react-native";
import { WEB_DEV_CONFIG_PROXY_PATH } from "../../../devConfigProxyPath.js";

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

function configRequestUrl(configEntryKey?: string): string {
  const entryKey = configEntryKey?.trim();
  const useDevProxy = isWebDevUsingMetroProxy();
  if (useDevProxy) {
    if (entryKey) {
      const qs = new URLSearchParams({ config_key: entryKey });
      return `${window.location.origin}${WEB_DEV_CONFIG_PROXY_PATH}?${qs.toString()}`;
    }
    return `${window.location.origin}${WEB_DEV_CONFIG_PROXY_PATH}`;
  }
  const base = requiredEnv("API_CONFIG_PUBLIC_URL", apiConfigPublicUrl);
  if (!entryKey) {
    return base;
  }
  const url = new URL(base);
  url.searchParams.set("config_key", entryKey);
  return url.toString();
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

/** `GET` public config; `configEntryKey` selects `?config_key=…` (e.g. `data`). */
export async function fetchPublicConfigValue<T>(configEntryKey?: string): Promise<T> {
  const entryKey = configEntryKey?.trim();
  const useDevProxy = isWebDevUsingMetroProxy();
  const url = configRequestUrl(entryKey);
  console.log("[configApi] request public config", { configEntryKey: entryKey ?? "_default", useDevProxy });
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
  if (!res.ok) {
    throw new Error(`Config API failed: HTTP ${res.status}`);
  }
  const payload = (await res.json()) as ConfigEnvelope;
  if (payload.errorCode !== 0) {
    throw new Error(payload.message?.trim() || `Config API failed: errorCode ${String(payload.errorCode)}`);
  }
  const value = parseConfigValue(payload.data?.value);
  if (value == null || typeof value !== "object") {
    throw new Error(
      `Config API response missing data.value${entryKey ? ` for config_key=${entryKey}` : ""}`,
    );
  }
  return value as T;
}

/** Reads `banners.code` from config center `config_key=data` for home banner carousel `group_code`. */
export async function fetchBannerGroupCode(): Promise<string> {
  const value = await fetchPublicConfigValue<AppDataConfigValue>(APP_DATA_CONFIG_KEY);
  const code = value.banners?.code;
  if (typeof code !== "string" || code.trim() === "") {
    throw new Error("Config data.banners.code missing or empty");
  }
  const trimmed = code.trim();
  console.log("[configApi] banner group code resolved", { code: trimmed });
  return trimmed;
}
