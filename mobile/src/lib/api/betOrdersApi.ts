import { betAggUserAccessHeaders, betAggUserAccessJsonHeaders } from "./betAggHeaders";
import {
  BET_LEADERBOARD_PATH,
  BET_ORDERS_PATH,
  BET_REPUTATION_PATH,
  BET_SNOWFLAKE_PATH,
  BET_SUBMIT_PATH,
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
import {
  MallUnauthorizedRedirectError,
  redirectIfMallSessionUnauthorized,
} from "@/lib/auth/mallSessionUnauthorized";
import { betOrderStatusLabel, type BetOrderFull, type BetOrderLine, type BetOrderListResult, type BetOrderSummary, type BetSubmitLine, type LeaderboardListResult, type LeaderboardRow, type ReputationData } from "./betTypes";

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

function selectionString(row: Record<string, unknown>): string | null {
  const s = row.selection;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return null;
}

function pickLabel(row: Record<string, unknown>): string | undefined {
  const pl = row.pick_label;
  if (typeof pl === "string" && pl.trim().length > 0) {
    return pl.trim();
  }
  return undefined;
}

/** `_dict` arrays: `{ k, v }` or `{ name, value }` style entries. */
function numericEnumLabelMap(rows: unknown): Map<number, string> | undefined {
  if (!Array.isArray(rows)) {
    return undefined;
  }
  const map = new Map<number, string>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      continue;
    }
    const o = row as Record<string, unknown>;
    const v = mallFiniteInt(o.v ?? o.value);
    const labelRaw = o.k ?? o.name;
    if (v === null || typeof labelRaw !== "string" || !labelRaw.trim()) {
      continue;
    }
    map.set(v, labelRaw.trim());
  }
  return map.size > 0 ? map : undefined;
}

function dictMapsFromRoot(root: Record<string, unknown>): {
  orderStatus?: Map<number, string>;
  lineResult?: Map<number, string>;
} {
  const d = root._dict;
  if (!d || typeof d !== "object" || Array.isArray(d)) {
    return {};
  }
  const dr = d as Record<string, unknown>;
  return {
    orderStatus: numericEnumLabelMap(dr.bet_order_status),
    lineResult: numericEnumLabelMap(dr.order_item_result),
  };
}

function mergeDictSources(...roots: Record<string, unknown>[]): {
  orderStatus?: Map<number, string>;
  lineResult?: Map<number, string>;
} {
  for (const root of roots) {
    const { orderStatus, lineResult } = dictMapsFromRoot(root);
    if (orderStatus !== undefined || lineResult !== undefined) {
      return { orderStatus, lineResult };
    }
  }
  return {};
}

function toBetLine(row: Record<string, unknown>, lineResult?: Map<number, string>): BetOrderLine {
  const market_id = mallFiniteInt(row.market_id);
  const selection = selectionString(row);
  if (market_id === null || selection === null) {
    throw new Error("Malformed prediction line");
  }
  const result = mallFiniteInt(row.result) ?? undefined;
  const pl = pickLabel(row);
  return {
    market_id,
    selection,
    ...(pl !== undefined ? { pick_label: pl } : {}),
    ...(result !== undefined ? { result } : {}),
    ...(result !== undefined && lineResult?.get(result) !== undefined
      ? { result_label: lineResult.get(result) }
      : {}),
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
  const ct = mallOrderEpochSeconds(row.ct);
  const ut = mallOrderEpochSeconds(row.ut);
  if (id === null || uid === null || status === null || ct === null || ut === null) {
    throw new Error("Malformed prediction order summary");
  }
  return { id, uid, status, ct, ut };
}

function parseBetOrderEnvelopeData(envData: Record<string, unknown>): BetOrderFull {
  const row = mallOrderRowFromDetailData(envData);
  const linesRawFromRow = Array.isArray(row.lines) ? row.lines : envData.lines;
  const merged: Record<string, unknown> = { ...envData, ...row };
  if (Array.isArray(linesRawFromRow)) {
    merged.lines = linesRawFromRow;
  }
  const dict = mergeDictSources(envData, merged, row);
  return toBetOrderFull(merged, dict);
}

function toBetOrderFull(
  data: Record<string, unknown>,
  dict: { orderStatus?: Map<number, string>; lineResult?: Map<number, string> },
): BetOrderFull {
  const base = toBetOrderSummary(data);
  const linesRaw = data.lines;
  if (!Array.isArray(linesRaw)) {
    throw new Error("Malformed prediction order detail");
  }
  const lineResultMap = dict.lineResult;
  const lines = linesRaw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r))
    .map((r) => toBetLine(r, lineResultMap));
  const status_label =
    dict.orderStatus?.get(base.status) ?? betOrderStatusLabel(base.status);
  return {
    ...base,
    lines,
    status_label,
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
    throw new Error("Malformed prediction order list");
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

function parseBetSubmitResponseData(data: Record<string, unknown>): BetOrderFull {
  const orderRaw = data.order;
  if (orderRaw && typeof orderRaw === "object" && !Array.isArray(orderRaw)) {
    const combined: Record<string, unknown> = { ...data, ...orderRaw };
    return parseBetOrderEnvelopeData(combined);
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
  const res = await fetchWithHttpDebug(`${base}${BET_SNOWFLAKE_PATH}`, {
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
 * `POST /api/bet/submit` — single line accepted: `{ lines: [{ market_id, outcome_code }] }`.
 */
export async function submitBetOrder(lines: BetSubmitLine[]): Promise<BetOrderFull> {
  if (lines.length !== 1) {
    throw new Error("Submit expects exactly one prediction line");
  }
  const base = await betBase();
  const xRequestId = await fetchBetSnowflakeRequestId(base);
  const res = await fetchWithHttpDebug(`${base}${BET_SUBMIT_PATH}`, {
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
  return parseBetSubmitResponseData(data);
}

export async function fetchBetReputation(): Promise<ReputationData> {
  const base = await betBase();
  const res = await fetchWithHttpDebug(`${base}${BET_REPUTATION_PATH}`, {
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
  const score = mallFiniteInt(data.score);
  if (score === null) {
    throw new Error("Malformed reputation response");
  }
  return { score };
}

function toLeaderboardRow(row: Record<string, unknown>): LeaderboardRow {
  const rank = mallFiniteInt(row.rank);
  const uid = mallFiniteInt(row.uid);
  const score = mallFiniteInt(row.score);
  if (rank === null || uid === null || score === null) {
    throw new Error("Malformed leaderboard row");
  }
  return { rank, uid, score };
}

export async function fetchBetLeaderboardPage(params?: {
  page?: number;
  per_page?: number;
}): Promise<LeaderboardListResult> {
  const base = await betBase();
  const qs = new URLSearchParams({
    page: String(params?.page ?? 1),
    per_page: String(params?.per_page ?? 50),
  });
  const res = await fetchWithHttpDebug(`${base}${BET_LEADERBOARD_PATH}?${qs.toString()}`, {
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
  const itemsRaw = data.items as unknown;
  if (!Array.isArray(itemsRaw)) {
    throw new Error("Malformed leaderboard list");
  }
  const items = itemsRaw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row))
    .map((row) => toLeaderboardRow(row));
  const pagRaw = data.pagination as unknown;
  const pagination =
    pagRaw && typeof pagRaw === "object" && !Array.isArray(pagRaw)
      ? normalizeOrderPagination(pagRaw as Record<string, unknown>)
      : {
          total: items.length,
          per_page: Math.max(items.length, 1),
          current_page: 1,
          last_page: 1,
        };
  return { items, pagination };
}
