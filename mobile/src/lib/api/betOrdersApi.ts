import { betAggUserAccessHeaders, betAggUserAccessJsonHeaders } from "./betAggHeaders";
import type {
  BetOrderFull,
  BetOrderLine,
  BetOrderListResult,
  BetOrderSummary,
} from "./betTypes";
import { BET_CHECKOUT_PATH, BET_ORDERS_PATH, BET_POINTS_PATH, betOrderPath } from "./betPaths";
import {
  assertMallSuccess,
  assertMallSuccessHttp,
  MallApiError,
  readMallEnvelope,
  requireMallObjectData,
} from "./mallEnvelope";
import { normalizeOrderPagination } from "./mallPagination";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { getServiceOrigins } from "@/lib/serviceOrigins";

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

function mallUnixSeconds(value: unknown): number | null {
  const asInt = mallFiniteInt(value);
  if (asInt !== null) {
    return asInt;
  }
  if (typeof value === "string") {
    const ms = Date.parse(value);
    if (!Number.isFinite(ms)) {
      return null;
    }
    return Math.floor(ms / 1000);
  }
  return null;
}

function pointsBalanceMinorFromDataPayload(root: Record<string, unknown>): number {
  const bal = mallFiniteInt(root.balance_minor ?? root.balanceMinor);
  if (bal !== null && bal >= 0) {
    return bal;
  }
  const inner = root.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    const nested = mallFiniteInt((inner as Record<string, unknown>).balance_minor);
    if (nested !== null && nested >= 0) {
      return nested;
    }
  }
  return 0;
}

function toBetLine(row: Record<string, unknown>): BetOrderLine {
  const kid = mallFiniteInt(row.kid);
  const stake_points = mallFiniteInt(row.stake_points);
  if (kid === null || stake_points === null) {
    throw new Error("Malformed bet line");
  }
  const decimal_odds_millis = mallFiniteInt(row.decimal_odds_millis) ?? undefined;
  const potential_return_points = mallFiniteInt(row.potential_return_points) ?? undefined;
  const result = mallFiniteInt(row.result) ?? undefined;
  return {
    kid,
    stake_points,
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
  const ct = mallUnixSeconds(row.ct);
  const ut = mallUnixSeconds(row.ut);
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
  const points_deduct = mallFiniteInt(data.points_deduct_minor) ?? 0;
  const cash_payable = mallFiniteInt(data.cash_payable_minor) ?? 0;
  const checkout_phase =
    typeof data.checkout_phase === "string" ? data.checkout_phase : undefined;
  return {
    ...base,
    points_deduct_minor: points_deduct >= 0 ? points_deduct : 0,
    cash_payable_minor: cash_payable >= 0 ? cash_payable : 0,
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
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  if (!res.ok) {
    throw new Error(env.message?.trim() || `HTTP ${res.status}`);
  }
  assertMallSuccess(env);
  const data = requireMallObjectData(env);
  return parseBetOrderEnvelopeData(data);
}

export async function createBetDraftOrder(lines: { kid: number; stake_points: number }[]): Promise<BetOrderFull> {
  const base = await betBase();
  const res = await fetchWithHttpDebug(`${base}${BET_ORDERS_PATH}`, {
    method: "POST",
    headers: betAggUserAccessJsonHeaders(),
    body: JSON.stringify({ lines }),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 401) {
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  assertMallSuccessHttp(env, res.status);
  if (!res.ok) {
    throw new MallApiError(env.message?.trim() || `HTTP ${res.status}`, env.errorCode, res.status);
  }
  const data = requireMallObjectData(env);
  return parseBetOrderEnvelopeData(data);
}

export type BetCheckoutResponse = {
  order: BetOrderFull;
  prepay: Record<string, unknown>;
};

export async function checkoutBetOrder(input: { order_id: number; points_minor?: number }): Promise<BetCheckoutResponse> {
  const base = await betBase();
  const body: Record<string, unknown> = { order_id: input.order_id };
  const pm = input.points_minor;
  if (pm !== undefined && pm > 0) {
    body.points_minor = pm;
  }
  const res = await fetchWithHttpDebug(`${base}${BET_CHECKOUT_PATH}`, {
    method: "POST",
    headers: betAggUserAccessJsonHeaders(),
    body: JSON.stringify(body),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 401) {
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  assertMallSuccessHttp(env, res.status);
  if (!res.ok) {
    throw new MallApiError(env.message?.trim() || `HTTP ${res.status}`, env.errorCode, res.status);
  }
  const data = requireMallObjectData(env);
  const orderRaw = data.order;
  if (!orderRaw || typeof orderRaw !== "object" || Array.isArray(orderRaw)) {
    throw new Error("Malformed checkout: order");
  }
  const order = parseBetOrderEnvelopeData(orderRaw as Record<string, unknown>);
  const prepayRaw = data.prepay;
  const prepay =
    prepayRaw && typeof prepayRaw === "object" && !Array.isArray(prepayRaw)
      ? (prepayRaw as Record<string, unknown>)
      : {};
  return { order, prepay };
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
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  assertMallSuccessHttp(env, res.status);
  const data = requireMallObjectData(env);
  return { balance_minor: pointsBalanceMinorFromDataPayload(data) };
}
