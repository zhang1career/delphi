import Constants from "expo-constants";

type Extra = {
  apiConfigPublicUrl?: string;
  apiConfigPublicKey?: string;
  apiConfigAccessKey?: string;
  servFdPort?: string;
  cdnDistributionId?: string;
  webDevGatewayProxyOrigin?: string;
  tokenRefreshIntervalMs?: number;
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

export const apiConfigPublicUrl = readTrimmed(extra.apiConfigPublicUrl);
export const apiConfigPublicKey = readTrimmed(extra.apiConfigPublicKey);
export const apiConfigAccessKey = readTrimmed(extra.apiConfigAccessKey);
export const servFdPort = readTrimmed(extra.servFdPort);
export const cdnDistributionId = readTrimmed(extra.cdnDistributionId);
export const webDevGatewayProxyOrigin = readTrimmed(extra.webDevGatewayProxyOrigin);

/** From `.env` `TOKEN_REFRESH_INTERVAL_MS` via `app.config.js`. Null disables periodic refresh. */
export const tokenRefreshIntervalMs: number | null = (() => {
  const n = extra.tokenRefreshIntervalMs;
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

export const appLogLevel: AppLogLevel = parseLogLevel(extra.logLevel);
