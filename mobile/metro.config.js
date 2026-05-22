const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const { getDefaultConfig } = require("expo/metro-config");
const { WEB_DEV_CONFIG_PROXY_PATH } = require("./devConfigProxyPath");
const { WEB_DEV_GATEWAY_PROXY_PATH } = require("./devGatewayProxyPath");

require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
  quiet: true,
});

const RUN_ENV = (process.env.RUN_ENV || "").trim();
if (RUN_ENV === "dev" || RUN_ENV === "test" || RUN_ENV === "prod") {
  require("dotenv").config({
    path: path.resolve(__dirname, "..", `.env.${RUN_ENV}`),
    override: true,
    quiet: true,
  });
  process.env.RUN_ENV = RUN_ENV;
}

/** Required for OpenAPI: unset → docs URL not enabled (404). Agents send matching `X-Agent-OpenAPI-Secret` or `Authorization: Bearer`. */
function webAgentOpenApiSecretConfigured() {
  return String(process.env.WEB_AGENT_OPENAPI_SECRET ?? "").trim();
}

function agentOpenApiSecretFromRequest(req) {
  const header = req.headers["x-agent-openapi-secret"];
  if (typeof header === "string" && header.trim() !== "") {
    return header.trim();
  }
  const auth = req.headers["authorization"];
  if (typeof auth === "string") {
    const m = /^Bearer\s+(\S+)/i.exec(auth.trim());
    if (m) {
      return m[1].trim();
    }
  }
  return "";
}

/**
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
function serveDevConfigProxy(req, res) {
  const targetStr = (process.env.API_CONFIG_PUBLIC_URL || "").trim();
  const accessKey = (process.env.API_CONFIG_ACCESS_KEY || "").trim();
  const publicKey = (process.env.API_CONFIG_PUBLIC_KEY || "").trim();

  if (!targetStr || !accessKey || !publicKey) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error: "Dev config proxy: set API_CONFIG_PUBLIC_URL, API_CONFIG_ACCESS_KEY, API_CONFIG_PUBLIC_KEY in .env",
      }),
    );
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(targetStr);
  } catch {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Dev config proxy: invalid API_CONFIG_PUBLIC_URL" }));
    return;
  }

  const isHttps = targetUrl.protocol === "https:";
  const lib = isHttps ? https : http;
  /** Fusio enforces User-Agent; Node clients omit it by default (browser fetch includes it). */
  const userAgentRaw = req.headers["user-agent"];
  const userAgent =
    typeof userAgentRaw === "string" && userAgentRaw.trim() !== ""
      ? userAgentRaw.trim()
      : "BetMobile-ExpoDevConfigProxy/1.0";
  let upstreamPath = targetUrl.pathname + targetUrl.search;
  try {
    const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const configEntryKey = reqUrl.searchParams.get("config_key")?.trim();
    if (configEntryKey) {
      const upstreamUrl = new URL(targetUrl);
      upstreamUrl.searchParams.set("config_key", configEntryKey);
      upstreamPath = upstreamUrl.pathname + upstreamUrl.search;
    }
  } catch {
    // Keep default upstream path when request URL cannot be parsed.
  }

  const opts = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (isHttps ? 443 : 80),
    path: upstreamPath,
    method: "GET",
    headers: {
      "User-Agent": userAgent,
      "X-Config-Access-Key": accessKey,
      "X-Config-Key": publicKey,
    },
  };

  const preq = lib.request(opts, (pres) => {
    res.statusCode = pres.statusCode ?? 502;
    const hopByHop = new Set([
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailers",
      "transfer-encoding",
      "upgrade",
    ]);
    for (const [key, value] of Object.entries(pres.headers)) {
      if (value === undefined || hopByHop.has(key.toLowerCase())) {
        continue;
      }
      if (Array.isArray(value)) {
        res.setHeader(key, value);
      } else {
        res.setHeader(key, value);
      }
    }
    pres.pipe(res);
  });

  preq.on("error", (err) => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          error: `Dev config proxy upstream error: ${String(err.message || err)}`,
        }),
      );
    }
  });

  preq.end();
}

/**
 * Forwards browser requests to `WEB_DEV_GATEWAY_PROXY_ORIGIN` so Web dev stays same-origin
 * (workaround when upstream sends invalid duplicate CORS headers).
 *
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
function serveDevGatewayProxy(req, res) {
  let originStr = (process.env.WEB_DEV_GATEWAY_PROXY_ORIGIN || "").trim().replace(/\/$/, "");
  if (!originStr) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error:
          "Dev gateway proxy: set WEB_DEV_GATEWAY_PROXY_ORIGIN in .env (must match config gateway, e.g. http://HOST:PORT)",
      }),
    );
    return;
  }

  if (!/^https?:\/\//i.test(originStr)) {
    originStr = `http://${originStr}`;
  }

  let upstream;
  try {
    upstream = new URL(originStr);
  } catch {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Dev gateway proxy: invalid WEB_DEV_GATEWAY_PROXY_ORIGIN" }));
    return;
  }

  const reqUrl = req.url ?? "";
  const prefix = WEB_DEV_GATEWAY_PROXY_PATH;
  let pathAndQuery;
  if (reqUrl.startsWith(`${prefix}/`)) {
    pathAndQuery = reqUrl.slice(prefix.length);
  } else if (reqUrl === prefix || reqUrl.startsWith(`${prefix}?`)) {
    pathAndQuery = reqUrl.length > prefix.length ? reqUrl.slice(prefix.length) : "/";
    if (!pathAndQuery.startsWith("/")) {
      pathAndQuery = `/${pathAndQuery}`;
    }
  } else {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Dev gateway proxy: malformed path" }));
    return;
  }

  const isHttps = upstream.protocol === "https:";
  const lib = isHttps ? https : http;
  const defaultPort = isHttps ? 443 : 80;
  const port = upstream.port ? Number(upstream.port) : defaultPort;

  const hopByHopRequest = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
  ]);

  /** @type {Record<string, string | string[]>} */
  const filteredHeaders = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (hopByHopRequest.has(key.toLowerCase())) {
      continue;
    }
    if (value === undefined) {
      continue;
    }
    filteredHeaders[key] = value;
  }

  const opts = {
    hostname: upstream.hostname,
    port,
    path: pathAndQuery,
    method: req.method || "GET",
    headers: filteredHeaders,
  };

  const preq = lib.request(opts, (pres) => {
    res.statusCode = pres.statusCode ?? 502;
    const hopByHopResp = new Set([
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailers",
      "transfer-encoding",
      "upgrade",
    ]);
    for (const [key, value] of Object.entries(pres.headers)) {
      if (value === undefined) {
        continue;
      }
      const lower = key.toLowerCase();
      if (hopByHopResp.has(lower) || lower.startsWith("access-control-")) {
        continue;
      }
      if (Array.isArray(value)) {
        res.setHeader(key, value);
      } else {
        res.setHeader(key, value);
      }
    }
    pres.pipe(res);
  });

  preq.on("error", (err) => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          error: `Dev gateway proxy upstream error: ${String(err.message || err)}`,
        }),
      );
    }
  });

  req.pipe(preq);
}

/**
 * Serves `public/readme.txt` at the same paths as production nginx (`/readme`, `{WEB_BASE_PATH}/readme`, etc.)
 * so the About tab can `fetch` documentation during `expo start --web`.
 *
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @returns {boolean} true if the request was handled
 */
function servePublicDeployReadme(req, res) {
  if ((req.method || "GET").toUpperCase() !== "GET") {
    return false;
  }

  const pathOnly = (req.url ?? "").split("?", 1)[0];
  const base = String(process.env.WEB_BASE_PATH ?? "")
    .trim()
    .replace(/\/$/, "");
  /** @type {Set<string>} */
  const paths = new Set(["/readme.txt", "/readme"]);
  if (base) {
    paths.add(`${base}/readme.txt`);
    paths.add(`${base}/readme`);
  }
  if (!paths.has(pathOnly)) {
    return false;
  }

  const filePath = path.join(__dirname, "public", "readme.txt");
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Documentation file missing (public/readme.txt).");
      return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(buf);
  });
  return true;
}

/**
 * `GET /api/openapi.json` and `GET /api/agent/openapi.json` — **agent only**.
 * Requires `WEB_AGENT_OPENAPI_SECRET` in `.env`; without it responds 404. Wrong/missing credential → 403.
 *
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
function serveAgentOnlyOpenApiJson(req, res) {
  if ((req.method || "GET").toUpperCase() !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end();
    return;
  }

  const expectedSecret = webAgentOpenApiSecretConfigured();
  if (expectedSecret === "") {
    res.statusCode = 404;
    res.end();
    return;
  }
  if (agentOpenApiSecretFromRequest(req) !== expectedSecret) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Forbidden" }));
    return;
  }

  const filePath = path.join(__dirname, "agent-docs", "openapi.json");
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "OpenAPI snapshot missing (agent-docs/openapi.json)" }));
      return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(buf);
  });
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Watchman can report an inconsistent crawl for the repo root (e.g. after recrawl /
// `MustScanSubDirs`), which makes metro-file-map TreeFS treat a package dir as a file.
// Node crawling avoids that class of failures; startup may be slightly slower.
config.resolver = {
  ...config.resolver,
  useWatchman: false,
};

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => {
    return (req, res, next) => {
      const url = req.url ?? "";
      const pathOnly = url.split("?", 1)[0];
      if (servePublicDeployReadme(req, res)) {
        return;
      }
      const agentOpenApiPaths = new Set(["/api/openapi.json", "/api/agent/openapi.json"]);
      if (agentOpenApiPaths.has(pathOnly)) {
        serveAgentOnlyOpenApiJson(req, res);
        return;
      }
      if (url.startsWith(WEB_DEV_GATEWAY_PROXY_PATH)) {
        serveDevGatewayProxy(req, res);
        return;
      }
      if (url.startsWith(WEB_DEV_CONFIG_PROXY_PATH)) {
        serveDevConfigProxy(req, res);
        return;
      }
      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = config;
