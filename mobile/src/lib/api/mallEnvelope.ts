export type MallApiEnvelope = {
  data: unknown;
  errorCode: number;
  message: string;
  _req_id: string;
};

/** Thrown when `errorCode !== 0` or HTTP failure after reading a mall `ApiEnvelope`. */
export class MallApiError extends Error {
  readonly errorCode: number;
  readonly httpStatus: number;

  constructor(message: string, errorCode: number, httpStatus: number) {
    super(message);
    this.name = "MallApiError";
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
  }
}

export async function readMallEnvelope(res: Response): Promise<MallApiEnvelope> {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!body || typeof body !== "object") {
    throw new Error(text || `HTTP ${res.status}`);
  }
  return body as MallApiEnvelope;
}

/**
 * Treat success as numeric zero only. Gateways/serializers may send `errorCode` as a string
 * (e.g. `"0"`), which would fail a strict `!== 0` check against the number `0`.
 */
export function normalizeMallErrorCode(env: MallApiEnvelope): number {
  const o = env as unknown as Record<string, unknown>;
  const raw = o.errorCode ?? o.error_code;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.trunc(raw);
  }
  if (typeof raw === "string") {
    const n = Number.parseInt(raw.trim(), 10);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return NaN;
}

export function assertMallSuccess(env: MallApiEnvelope): void {
  const code = normalizeMallErrorCode(env);
  if (code !== 0) {
    throw new Error(env.message?.trim() || `Request failed (errorCode ${String(code)})`);
  }
}

export function assertMallSuccessHttp(env: MallApiEnvelope, httpStatus: number): void {
  const code = normalizeMallErrorCode(env);
  if (code !== 0) {
    throw new MallApiError(
      env.message?.trim() || `Request failed (errorCode ${String(code)})`,
      Number.isFinite(code) ? code : -1,
      httpStatus,
    );
  }
}

export function requireMallObjectData<T extends Record<string, unknown>>(env: MallApiEnvelope): T {
  const d = env.data;
  if (!d || typeof d !== "object" || Array.isArray(d)) {
    throw new Error(env.message?.trim() || "Invalid response data");
  }
  return d as T;
}
