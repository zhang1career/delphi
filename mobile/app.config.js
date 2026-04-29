const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
  // dotenv v17 logs to stdout by default; that breaks CocoaPods parsing JSON from `expo-modules-autolinking`.
  quiet: true,
});

const RUN_ENV = (process.env.RUN_ENV || "").trim();
if (RUN_ENV === "dev" || RUN_ENV === "test" || RUN_ENV === "prod") {
  require("dotenv").config({
    path: path.resolve(__dirname, "..", `.env.${RUN_ENV}`),
    override: true,
    quiet: true,
  });
  // RUN_ENV only comes from `.env`; ignore any RUN_ENV in `.env.{env}`.
  process.env.RUN_ENV = RUN_ENV;
}

/** @param {string} name */
function envTrim(name) {
  const v = process.env[name];
  if (v == null || String(v).trim() === "") return undefined;
  return String(v).trim();
}

/** Comma-separated hostnames/IPs for NSExceptionDomains (cleartext HTTP); see docs/TODO.md. */
function parseIosAtsInsecureHttpDomains() {
  const raw = envTrim("IOS_ATS_INSECURE_HTTP_DOMAINS");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const APP_DISPLAY_NAME = envTrim("APP_DISPLAY_NAME");
const APP_VERSION = envTrim("APP_VERSION");
const APP_MODULE_NAME = envTrim("APP_MODULE_NAME");
const BUNDLE_ID = envTrim("BUNDLE_ID");

/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
  expo: {
    /**
     * Expo prebuild names the iOS Xcode project / `ios/<Name>/` from `sanitizedName(expo.name)`.
     * Home-screen label uses `APP_DISPLAY_NAME` via `ios/scripts/sync-ios-metadata-from-env.sh`.
     */
    name: APP_MODULE_NAME ?? "Platform Scaffold",
    slug: "platform-scaffold",
    version: APP_VERSION ?? "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "platformscaffold",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0f172a",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: BUNDLE_ID ?? "com.example.platformscaffold",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundColor: "#0f172a",
      },
      package: "com.example.platformscaffold",
    },
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "./plugins/withIosEnvSyncPodfile.js",
      ["./plugins/withIosAtsInsecureHttp.js", { domains: parseIosAtsInsecureHttpDomains() }],
    ],
    extra: {
      router: { origin: false },
      apiConfigPublicUrl: envTrim("API_CONFIG_PUBLIC_URL"),
      apiConfigPublicKey: envTrim("API_CONFIG_PUBLIC_KEY"),
      apiConfigAccessKey: envTrim("API_CONFIG_ACCESS_KEY"),
      apiGatewayPort: envTrim("API_GATEWAY_PORT"),
      servFdPort: envTrim("SERV_FD_PORT"),
      cdnDistributionId: envTrim("CDN_DISTRIBUTION_ID"),
      tokenRefreshIntervalMs: (() => {
        const raw = process.env.TOKEN_REFRESH_INTERVAL_MS;
        if (raw == null || String(raw).trim() === "") return undefined;
        const n = Number.parseInt(String(raw), 10);
        return Number.isFinite(n) && n > 0 ? n : undefined;
      })(),
      features: {
        commerce: true,
        cart: false,
        orders: true,
      },
      // Default `info`: verbose HTTP logging (`fetchWithHttpDebug` body reads) stays off unless you set `APP_LOG_LEVEL=debug`.
      logLevel: envTrim("APP_LOG_LEVEL") ?? "info",
    },
  },
};
