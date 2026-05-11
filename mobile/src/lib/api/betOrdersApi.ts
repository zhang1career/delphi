import { betAggUserAccessHeaders, betAggUserAccessJsonHeaders } from "./betAggHeaders";
import type {
  BetOrderFull,
  BetOrderLine,
  BetOrderListResult,
  BetOrderSummary,
  CreateBetOrderLine,
} from "./betTypes";
import {
  BET_ORDERS_PATH,
  BET_PLACE_PATH,
  BET_POINTS_PATH,
  SNOWFLAKE_ID_PATH,
  betOrderPath,
} from "./betPaths";
import {
  assertMallSuccess,
  assertMallSuccessHttp,
  MallApiError,
  type MallApiEnvelope,
  readMallEnvelope,
  requireMallObjectData,
} from "./mallEnvelope";
import { normalizeOrderPagination } from "./mallPagination";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { snowflakeAccessKey } from "@/lib/config";
import { getServiceOrigins } from "@/lib/serviceOrigins";
import { surrogateSelectionKidFromMarketOutcome } from "@/lib/api/betSelectionKid";
import {
  MallUnauthorizedRedirectError,
  redirectIfMallSessionUnauthorized,
} from "@/lib/auth/mallSessionUnauthorized";

async function betBase(): Promise<string> {
  const { mallAggBaseUrl } = await getServiceOrigins();
  return mallAggBaseUrl.replace(/\/$/, "");
}

function mallFiniteInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (t === "") {
      return null;
    }
    const n = Number.parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Order `ct` / `ut` may be Unix seconds or milliseconds (large integers). */
function mallOrderEpochSeconds(value: unknown): number | null {
  const n = mallFiniteInt(value);
  if (n !== null) {
    if (n > 1_000_000_000_000) {
      return Math.floor(n / 1000);
    }
    return n;
  }
  if (typeof value === "string") {
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) {
      return Math.floor(ms / 1000);
    }
  }
  return null;
}

function betLineSelectionCode(row: Record<string, unknown>): string | null {
  const sel = row.selection;
  if (sel && typeof sel === "object" && !Array.isArray(sel)) {
    const code = (sel as Record<string, unknown>).code;
    if (typeof code === "string" && code.trim().length > 0) {
      return code.trim();
    }
  }
  const oc = row.outcome_code;
  if (typeof oc === "string" && oc.trim().length > 0) {
    return oc.trim();
  }
  return null;
}

function pointsBalanceMinorFromDataPayload(root: Record<string, unknown>): number {
  const bal = mallFiniteInt(root.balance_minor ?? root.balanceMinor ?? root.balance);
  if (bal !== null && bal >= 0) {
    return bal;
  }
  const inner = root.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    const slice = inner as Record<string, unknown>;
    const nested = mallFiniteInt(slice.balance_minor ?? slice.balanceMinor ?? slice.balance);
    if (nested !== null && nested >= 0) {
      return nested;
    }
  }
  return 0;
}

function toBetLine(row: Record<string, unknown>): BetOrderLine {
  const stake_points = mallFiniteInt(row.stake_points);
  if (stake_points === null) {
    throw new Error("Malformed bet line");
  }
  let kid = mallFiniteInt(row.kid);
  const market_id = mallFiniteInt(row.market_id);
  const selection_code = betLineSelectionCode(row);
  if (kid === null && market_id !== null && selection_code !== null) {
    kid = surrogateSelectionKidFromMarketOutcome(market_id, selection_code);
  }
  if (kid === null) {
    throw new Error("Malformed bet line");
  }
  const decimal_odds_millis = mallFiniteInt(row.decimal_odds_millis) ?? undefined;
  const potential_return_points = mallFiniteInt(row.potential_return_points) ?? undefined;
  const result = mallFiniteInt(row.result) ?? undefined;
  return {
    kid,
    stake_points,
    ...(market_id !== null ? { market_id } : {}),
    ...(selection_code !== null ? { selection_code } : {}),
    ...(decimal_odds_millis !== undefined ? { decimal_odds_millis } : {}),
    ...(potential_return_points !== undefined ? { potential_return_points } : {}),
    ...(row.odds_snapshot !== undefined ? { odds_snapshot: row.odds_snapshot } : {}),
    ...(result !== undefined ? { result } : {}),
  };
}

function mallOrderRowFromDetailData(data: Record<string, unknown>): Record<string, unknown> {
  const nested = data.order;
  if (
    nested &&
    typeof nested === "object" &&
    !Array.isArray(nested) &&
    mallFiniteInt((nested as Record<string, unknown>).id) !== null
  ) {
    return nested as Record<string, unknown>;
  }
  return data;
}

function toBetOrderSummary(row: Record<string, unknown>): BetOrderSummary {
  const id = mallFiniteInt(row.id);
  const uid = mallFiniteInt(row.uid);
  const status = mallFiniteInt(row.status);
  const total = mallFiniteInt(row.total_price);
  const ct = mallOrderEpochSeconds(row.ct);
  const ut = mallOrderEpochSeconds(row.ut);
  if (id === null || uid === null || status === null || total === null || ct === null || ut === null) {
    throw new Error("Malformed bet order summary");
  }
  return { id, uid, status, total_price: total, ct, ut };
}

function parseBetOrderEnvelopeData(envData: Record<string, unknown>): BetOrderFull {
  const row = mallOrderRowFromDetailData(envData);
  const linesRawFromRow = Array.isArray(row.lines) ? row.lines : envData.lines;
  const merged: Record<string, unknown> = { ...envData, ...row };
  if (Array.isArray(linesRawFromRow)) {
    merged.lines = linesRawFromRow;
  }
  return toBetOrderFull(merged);
}

function toBetOrderFull(data: Record<string, unknown>): BetOrderFull {
  const base = toBetOrderSummary(data);
  const linesRaw = data.lines;
  if (!Array.isArray(linesRaw)) {
    throw new Error("Malformed bet order detail");
  }
  const lines = linesRaw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r))
    .map((r) => toBetLine(r));
  const pointsHeldRaw = mallFiniteInt(data.points_held);
  const points_held =
    pointsHeldRaw !== null && pointsHeldRaw >= 0 ? pointsHeldRaw : 0;
  const phaseRaw = data.checkout_phase;
  let checkout_phase: number | undefined;
  if (typeof phaseRaw === "number" && Number.isFinite(phaseRaw)) {
    checkout_phase = Math.trunc(phaseRaw);
  } else if (typeof phaseRaw === "string") {
    const n = Number.parseInt(phaseRaw.trim(), 10);
    if (Number.isFinite(n)) {
      checkout_phase = n;
    }
  }
  return {
    ...base,
    points_held,
    lines,
    ...(data.ext_inventory !== undefined ? { ext_inventory: data.ext_inventory } : {}),
    ...(data.ext_id !== undefined ? { ext_id: data.ext_id } : {}),
    ...(checkout_phase !== undefined ? { checkout_phase } : {}),
  };
}

export async function fetchBetOrdersPage(params?: {
  page?: number;
  per_page?: number;
}): Promise<BetOrderListResult> {
  const base = await betBase();
  const qs = new URLSearchParams({
    page: String(params?.page ?? 1),
    per_page: String(params?.per_page ?? 15),
  });
  const res = await fetchWithHttpDebug(`${base}${BET_ORDERS_PATH}?${qs.toString()}`, {
    method: "GET",
    headers: betAggUserAccessHeaders(),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 401) {
    if (redirectIfMallSessionUnauthorized(res, env)) {
      throw new MallUnauthorizedRedirectError();
    }
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  if (!res.ok) {
    throw new Error(env.message?.trim() || `HTTP ${res.status}`);
  }
  assertMallSuccess(env);
  const data = requireMallObjectData(env);
  const itemsRaw = data.items as unknown;
  const pagRaw = data.pagination as unknown;
  if (!Array.isArray(itemsRaw) || !pagRaw || typeof pagRaw !== "object" || Array.isArray(pagRaw)) {
    throw new Error("Malformed bet order list");
  }
  const items = itemsRaw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row))
    .map((row) => toBetOrderSummary(row));
  const pagination = normalizeOrderPagination(pagRaw as Record<string, unknown>);
  return { items, pagination };
}

export async function fetchBetOrder(orderId: string): Promise<BetOrderFull | null> {
  const base = await betBase();
  const numId = Number.parseInt(orderId, 10);
  if (!Number.isFinite(numId) || numId < 1) {
    return null;
  }
  const res = await fetchWithHttpDebug(`${base}${betOrderPath(numId)}`, {
    method: "GET",
    headers: betAggUserAccessHeaders(),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 404) {
    return null;
  }
  if (res.status === 401) {
    if (redirectIfMallSessionUnauthorized(res, env)) {
      throw new MallUnauthorizedRedirectError();
    }
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  if (!res.ok) {
    throw new Error(env.message?.trim() || `HTTP ${res.status}`);
  }
  assertMallSuccess(env);
  const data = requireMallObjectData(env);
  return parseBetOrderEnvelopeData(data);
}

function parseBetPlaceResponseData(data: Record<string, unknown>): BetOrderFull {
  const orderRaw = data.order;
  if (orderRaw && typeof orderRaw === "object" && !Array.isArray(orderRaw)) {
    return parseBetOrderEnvelopeData(orderRaw as Record<string, unknown>);
  }
  return parseBetOrderEnvelopeData(data);
}

function snowflakeRequestIdFromEnvelope(env: MallApiEnvelope, fallbackMessage: string): string {
  const raw = env.data;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(env.message?.trim() || fallbackMessage);
  }
  const id = (raw as Record<string, unknown>).id;
  if (typeof id === "string" && id.trim().length > 0) {
    return id.trim();
  }
  throw new Error(env.message?.trim() || fallbackMessage);
}

async function fetchBetSnowflakeRequestId(base: string): Promise<string> {
  if (!snowflakeAccessKey) {
    throw new Error("Missing SF_SNOWFLAKE_ACCESS_KEY");
  }
  const res = await fetchWithHttpDebug(`${base}${SNOWFLAKE_ID_PATH}`, {
    method: "POST",
    headers: betAggUserAccessJsonHeaders(),
    body: JSON.stringify({ access_key: snowflakeAccessKey }),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 401) {
    if (redirectIfMallSessionUnauthorized(res, env)) {
      throw new MallUnauthorizedRedirectError();
    }
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  assertMallSuccessHttp(env, res.status);
  if (!res.ok) {
    throw new MallApiError(env.message?.trim() || `HTTP ${res.status}`, env.errorCode, res.status);
  }
  return snowflakeRequestIdFromEnvelope(env, "Malformed snowflake id response");
}

/**
 * `POST /api/bet/place`: body `{ lines: [{ kid, stake_points, expected_odds_millis }] }`; creates and settles in one step
 * (same response shape as historical draft + checkout: `data` or `data.order` with full order).
 */
export async function placeBetOrder(lines: CreateBetOrderLine[]): Promise<BetOrderFull> {
  const base = await betBase();
  const xRequestId = await fetchBetSnowflakeRequestId(base);
  const res = await fetchWithHttpDebug(`${base}${BET_PLACE_PATH}`, {
    method: "POST",
    headers: betAggUserAccessJsonHeaders({ "X-Request-Id": xRequestId }),
    body: JSON.stringify({ lines }),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 401) {
    if (redirectIfMallSessionUnauthorized(res, env)) {
      throw new MallUnauthorizedRedirectError();
    }
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  assertMallSuccessHttp(env, res.status);
  if (!res.ok) {
    throw new MallApiError(env.message?.trim() || `HTTP ${res.status}`, env.errorCode, res.status);
  }
  const data = requireMallObjectData(env);
  return parseBetPlaceResponseData(data);
}

export type PointsBalanceData = {
  balance_minor: number;
};

export async function fetchBetPointsBalance(): Promise<PointsBalanceData> {
  const base = await betBase();
  const res = await fetchWithHttpDebug(`${base}${BET_POINTS_PATH}`, {
    method: "GET",
    headers: betAggUserAccessHeaders(),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 401) {
    if (redirectIfMallSessionUnauthorized(res, env)) {
      throw new MallUnauthorizedRedirectError();
    }
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  assertMallSuccessHttp(env, res.status);
  const data = requireMallObjectData(env);
  return { balance_minor: pointsBalanceMinorFromDataPayload(data) };
}
