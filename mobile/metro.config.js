const path = require("path");
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
  const opts = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (isHttps ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
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

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => {
    return (req, res, next) => {
      const url = req.url ?? "";
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
