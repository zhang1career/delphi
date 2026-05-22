import { appLogLevel } from "@/lib/config";

const MAX_LOG_TEXT_LENGTH = 1200;

let httpDebugReadyLogged = false;

function isHttpDebugEnabled(): boolean {
  return appLogLevel === "debug";
}

/** Use `console.log`: browser DevTools often hides `console.debug` unless Verbose is on. */
function logHttp(event: "request" | "response" | "error", payload: Record<string, unknown>): void {
  if (!httpDebugReadyLogged) {
    httpDebugReadyLogged = true;
    console.log("[http] debug logging enabled", { appLogLevel });
  }
  console.log(`[http] ${event}`, payload);
}

function trimForLog(text: string): string {
  if (text.length <= MAX_LOG_TEXT_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_LOG_TEXT_LENGTH)}...(truncated)`;
}

function readRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function readRequestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  const fromInit = init?.method?.toUpperCase();
  if (fromInit) {
    return fromInit;
  }
  if (typeof input === "string" || input instanceof URL) {
    return "GET";
  }
  return (input.method || "GET").toUpperCase();
}

/** Strips only config API secrets; `Authorization` is logged as-is (enable only with `APP_LOG_LEVEL=debug`). */
function sanitizeHeaders(headersRaw: HeadersInit | undefined): Record<string, string> {
  if (!headersRaw) {
    return {};
  }
  const headers = new Headers(headersRaw);
  const out: Record<string, string> = {};
  headers.forEach((value: string, key: string) => {
    const lower = key.toLowerCase();
    if (lower === "x-config-access-key") {
      out[key] = "[REDACTED]";
      return;
    }
    out[key] = value;
  });
  return out;
}

function requestBodyPreview(body: BodyInit | null | undefined): string | undefined {
  if (body == null) {
    return undefined;
  }
  if (typeof body === "string") {
    return trimForLog(body);
  }
  if (body instanceof URLSearchParams) {
    return trimForLog(body.toString());
  }
  if (body instanceof FormData) {
    return "[FormData]";
  }
  if (body instanceof Blob) {
    return `[Blob size=${body.size}]`;
  }
  if (body instanceof ArrayBuffer) {
    return `[ArrayBuffer byteLength=${body.byteLength}]`;
  }
  if (ArrayBuffer.isView(body)) {
    return `[${body.constructor.name} byteLength=${body.byteLength}]`;
  }
  return `[${Object.prototype.toString.call(body)}]`;
}

async function responseBodyPreview(res: Response): Promise<string | undefined> {
  try {
    const text = await res.clone().text();
    return trimForLog(text);
  } catch {
    return "[unreadable body]";
  }
}

export async function fetchWithHttpDebug(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!isHttpDebugEnabled()) {
    return fetch(input, init);
  }

  const startedAt = Date.now();
  const url = readRequestUrl(input);
  const method = readRequestMethod(input, init);
  const reqBody = requestBodyPreview(init?.body);
  const reqHeaders = sanitizeHeaders(init?.headers);
  logHttp("request", {
    method,
    url,
    headers: reqHeaders,
    ...(reqBody ? { body: reqBody } : {}),
  });

  try {
    const res = await fetch(input, init);
    const durationMs = Date.now() - startedAt;
    const resHeaders = sanitizeHeaders(res.headers);
    const resBody = await responseBodyPreview(res);
    logHttp("response", {
      method,
      url,
      status: res.status,
      ok: res.ok,
      durationMs,
      headers: resHeaders,
      ...(resBody !== undefined ? { body: resBody } : {}),
    });
    return res;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logHttp("error", {
      method,
      url,
      durationMs,
      error,
    });
    throw error;
  }
}
