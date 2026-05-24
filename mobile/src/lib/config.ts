import Constants from "expo-constants";

type Extra = {
  apiConfigPublicUrl?: string;
  apiConfigPublicKey?: string;
  apiConfigAccessKey?: string;
  cdnDistributionId?: string;
  snowflakeAccessKey?: string;
  webDevGatewayProxyOrigin?: string;
  tokenRefreshIntervalMs?: number;
  hostRefreshIntervalMs?: number;
  features?: {
    commerce?: boolean;
    cart?: boolean;
    orders?: boolean;
  };
  logLevel?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function readTrimmed(value: string | undefined): string {
  return (value ?? "").trim();
}

export const apiConfigPublicUrl = readTrimmed(
  process.env.EXPO_PUBLIC_API_CONFIG_PUBLIC_URL ?? extra.apiConfigPublicUrl,
);
/** Config entry key for `GET /api/config/pub` via `X-Config-Key` header (e.g. gateway host). */
export const apiConfigPublicKey = readTrimmed(
  process.env.EXPO_PUBLIC_API_CONFIG_PUBLIC_KEY ?? extra.apiConfigPublicKey,
);
export const apiConfigAccessKey = readTrimmed(
  process.env.EXPO_PUBLIC_API_CONFIG_ACCESS_KEY ?? extra.apiConfigAccessKey,
);
export const cdnDistributionId = readTrimmed(extra.cdnDistributionId);
export const snowflakeAccessKey = readTrimmed(
  extra.snowflakeAccessKey ?? process.env.EXPO_PUBLIC_SF_SNOWFLAKE_ACCESS_KEY,
);
export const webDevGatewayProxyOrigin = readTrimmed(extra.webDevGatewayProxyOrigin);

/** From `.env` `TOKEN_REFRESH_INTERVAL_MS` via `app.config.js`. Null disables periodic refresh. */
export const tokenRefreshIntervalMs: number | null = (() => {
  const n = extra.tokenRefreshIntervalMs;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
})();

/** From `.env` `HOST_REFRESH_INTERVAL_MS` via `app.config.js`. Null disables periodic `GET /api/config/pub` refresh. */
export const hostRefreshIntervalMs: number | null = (() => {
  const n = extra.hostRefreshIntervalMs;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
})();

export const features = {
  commerce: extra.features?.commerce !== false,
  cart: extra.features?.cart !== false,
  orders: extra.features?.orders !== false,
};

export type AppLogLevel = "debug" | "info" | "warn" | "error";

function parseLogLevel(value: string | undefined): AppLogLevel {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "debug") return "debug";
  if (normalized === "warn") return "warn";
  if (normalized === "error") return "error";
  return "info";
}

export const appLogLevel: AppLogLevel = parseLogLevel(
  process.env.EXPO_PUBLIC_APP_LOG_LEVEL ?? extra.logLevel,
);
