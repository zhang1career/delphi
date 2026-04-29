import { wrapAsyncWithRateLimit } from "@zhang1career/network";
import type { CheckoutResponseData, PointsBalanceData, PrepayStub } from "./checkoutTypes";
import { mallAggBearerHeaders, mallAggJsonBearerHeaders } from "./mallAggHeaders";
import {
  assertMallSuccess,
  assertMallSuccessHttp,
  MallApiError,
  readMallEnvelope,
  requireMallObjectData,
} from "./mallEnvelope";
import {
  MALL_CHECKOUT_PATH,
  MALL_ORDERS_PATH,
  MALL_POINTS_PATH,
  mallOrderPath,
} from "./mallPaths";
import { normalizeOrderPagination } from "./mallPagination";
import type { OrderDetail, OrderListResult, OrderStatus, OrderSummary } from "./orderTypes";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { getServiceOrigins } from "@/lib/serviceOrigins";

async function mallBaseOrThrow(): Promise<string> {
  const { mallAggBaseUrl } = await getServiceOrigins();
  return mallAggBaseUrl.replace(/\/$/, "");
}

function isOrderSummaryRow(row: unknown): row is Record<string, unknown> {
  return !!row && typeof row === "object" && !Array.isArray(row);
}

/** Mall JSON often sends ints as numbers; DB/JSON casts may use numeric strings. */
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

/**
 * Some gateways wrap the resource once more: `data: { data: { balance_minor } }`.
 */
function pointsBalanceMinorFromDataPayload(root: Record<string, unknown>): number {
  const read = (slice: Record<string, unknown>): number | null => {
    const bal = mallFiniteInt(slice.balance_minor ?? slice.balanceMinor);
    return bal !== null && bal >= 0 ? bal : null;
  };

  const top = read(root);
  if (top !== null) {
    return top;
  }
  const inner = root.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    const nested = read(inner as Record<string, unknown>);
    if (nested !== null) {
      return nested;
    }
  }
  return 0;
}

function mallFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (t === "") {
      return null;
    }
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Unix seconds (int) or ISO-8601 string for the same field (`ct` / `ut`). */
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

/**
 * Detail/show payloads sometimes nest the row under `order` while list items are flat.
 * Only unwraps when the nested object carries a numeric `id` (same contract as list rows).
 */
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

function toOrderSummary(row: Record<string, unknown>): OrderSummary {
  const id = mallFiniteInt(row.id);
  const uid = mallFiniteInt(row.uid);
  const statusRaw = row.status;
  const total = mallFiniteNumber(row.total_price);
  const ct = mallUnixSeconds(row.ct);
  const ut = mallUnixSeconds(row.ut);

  const problems: string[] = [];
  if (id === null) {
    problems.push("id");
  }
  if (uid === null) {
    problems.push("uid");
  }
  const statusInt = mallFiniteInt(statusRaw);
  if (statusInt === null || statusInt < 0 || statusInt > 2) {
    problems.push(
      `status (need int 0–2, got ${statusRaw === null || statusRaw === undefined ? String(statusRaw) : JSON.stringify(statusRaw)})`,
    );
  }
  if (total === null) {
    problems.push("total_price");
  }
  if (ct === null) {
    problems.push("ct");
  }
  if (ut === null) {
    problems.push("ut");
  }
  if (problems.length > 0) {
    throw new Error(`Malformed order row: ${problems.join(", ")}`);
  }

  const status = statusInt as OrderStatus;
  return {
    id: id as number,
    uid: uid as number,
    status,
    total_price: Math.round(total as number),
    ct: ct as number,
    ut: ut as number,
  };
}

function optionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const t = value.trim();
  return t === "" ? undefined : t;
}

function toOrderLine(row: unknown): OrderDetail["lines"][number] {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("Malformed order line");
  }
  const r = row as Record<string, unknown>;
  const pid = mallFiniteInt(r.pid);
  const quantity = mallFiniteInt(r.quantity);
  const unit_price = mallFiniteNumber(r.unit_price);
  if (pid === null || quantity === null || unit_price === null) {
    throw new Error("Malformed order line fields");
  }
  const title = optionalTrimmedString(
    r.title ?? r.product_title ?? r.name ?? r.product_name,
  );
  const thumbnail = optionalTrimmedString(
    r.thumbnail ?? r.thumb ?? r.image ?? r.image_url ?? r.product_thumbnail,
  );
  return {
    pid,
    quantity,
    unit_price: Math.round(unit_price),
    ...(title !== undefined ? { title } : {}),
    ...(thumbnail !== undefined ? { thumbnail } : {}),
  };
}

function coordinatorExtras(data: Record<string, unknown>): Pick<
  OrderDetail,
  "ext_inventory" | "checkout_phase" | "tid"
> {
  const out: Pick<OrderDetail, "ext_inventory" | "checkout_phase" | "tid"> = {};
  const ext = data.ext_inventory;
  if (typeof ext === "boolean") {
    out.ext_inventory = ext;
  }
  const phase = mallFiniteInt(data.checkout_phase);
  if (phase !== null) {
    out.checkout_phase = phase;
  }
  if (typeof data.tid === "string") {
    out.tid = data.tid;
  }
  return out;
}

function toOrderDetail(data: Record<string, unknown>): OrderDetail {
  const base = toOrderSummary(data);
  const linesRaw = data.lines;
  if (!Array.isArray(linesRaw)) {
    throw new Error("Malformed order detail");
  }
  const lines = linesRaw.map(toOrderLine);
  const points_deduct_raw = mallFiniteInt(data.points_deduct_minor);
  const cash_payable_raw = mallFiniteInt(data.cash_payable_minor);
  const points_deduct_minor =
    points_deduct_raw !== null && points_deduct_raw >= 0 ? points_deduct_raw : 0;
  const cash_payable_minor =
    cash_payable_raw !== null && cash_payable_raw >= 0 ? cash_payable_raw : 0;
  return {
    ...base,
    lines,
    points_deduct_minor,
    cash_payable_minor,
    ...coordinatorExtras(data),
  };
}

function toPrepayStub(raw: Record<string, unknown>): PrepayStub {
  const order_id = mallFiniteInt(raw.order_id) ?? 0;
  const amount_minor = mallFiniteInt(raw.amount_minor) ?? 0;
  const uid = mallFiniteInt(raw.uid) ?? 0;
  const statusRaw = raw.status;
  const status =
    typeof statusRaw === "string" ? statusRaw : statusRaw == null ? "" : String(statusRaw);
  return { order_id, amount_minor, uid, status };
}

function parseCheckoutResponseData(data: Record<string, unknown>): CheckoutResponseData {
  const orderRaw = data.order;
  if (!orderRaw || typeof orderRaw !== "object" || Array.isArray(orderRaw)) {
    throw new Error("Malformed checkout: order");
  }
  const order = toOrderDetail(orderRaw as Record<string, unknown>);
  const prepayRaw = data.prepay;
  if (!prepayRaw || typeof prepayRaw !== "object" || Array.isArray(prepayRaw)) {
    throw new Error("Malformed checkout: prepay");
  }
  const prepay = toPrepayStub(prepayRaw as Record<string, unknown>);
  const pointsKey = data.points_tcc_idem_key;
  const points_tcc_idem_key =
    pointsKey === null || pointsKey === undefined
      ? null
      : typeof pointsKey === "string"
        ? pointsKey
        : null;
  const tidTop = typeof data.tid === "string" ? data.tid : "";
  const tid = tidTop || order.tid || "";
  return { order, prepay, points_tcc_idem_key, tid };
}

export async function fetchMallOrdersPage(params?: {
  page?: number;
  per_page?: number;
}): Promise<OrderListResult> {
  const base = await mallBaseOrThrow();
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 15;
  const qs = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const res = await fetchWithHttpDebug(`${base}${MALL_ORDERS_PATH}?${qs.toString()}`, {
    method: "GET",
    headers: mallAggBearerHeaders(),
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
  const itemsRaw = data.items;
  const pagRaw = data.pagination;
  if (!Array.isArray(itemsRaw) || !pagRaw || typeof pagRaw !== "object" || Array.isArray(pagRaw)) {
    throw new Error("Malformed order list");
  }
  const items = itemsRaw
    .filter(isOrderSummaryRow)
    .map((row) => toOrderSummary(row));
  const pagination = normalizeOrderPagination(pagRaw as Record<string, unknown>);
  return { items, pagination };
}

export type CreateMallOrderLine = {
  product_id: number;
  quantity: number;
};

/** `POST /api/mall-agg/orders` with JSON body `{ lines: [{ product_id, quantity }] }`. */
export async function createMallOrder(lines: CreateMallOrderLine[]): Promise<OrderDetail> {
  const base = await mallBaseOrThrow();
  const res = await fetchWithHttpDebug(`${base}${MALL_ORDERS_PATH}`, {
    method: "POST",
    headers: mallAggJsonBearerHeaders(),
    body: JSON.stringify({ lines }),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 401) {
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  assertMallSuccessHttp(env, res.status);
  if (!res.ok) {
    throw new MallApiError(
      env.message?.trim() || `HTTP ${res.status}`,
      env.errorCode,
      res.status,
    );
  }
  const data = requireMallObjectData(env);
  const row = mallOrderRowFromDetailData(data);
  const linesRaw = Array.isArray(row.lines) ? row.lines : data.lines;
  if (!Array.isArray(linesRaw)) {
    throw new Error("Malformed create order response");
  }
  const merged: Record<string, unknown> = { ...data, ...row, lines: linesRaw };
  return toOrderDetail(merged);
}

/**
 * Second step: `POST /api/mall-agg/checkout` with `{ order_id, points_minor? }`.
 * Call after `createMallOrder`. Same `points_minor` as stored may be used to refresh `prepay`.
 */
export async function checkoutMall(input: {
  order_id: number;
  points_minor?: number;
}): Promise<CheckoutResponseData> {
  const base = await mallBaseOrThrow();
  const body: Record<string, unknown> = { order_id: input.order_id };
  const pm = input.points_minor;
  if (pm !== undefined && pm > 0) {
    body.points_minor = pm;
  }
  const res = await fetchWithHttpDebug(`${base}${MALL_CHECKOUT_PATH}`, {
    method: "POST",
    headers: mallAggJsonBearerHeaders(),
    body: JSON.stringify(body),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 401) {
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  assertMallSuccessHttp(env, res.status);
  if (!res.ok) {
    throw new MallApiError(
      env.message?.trim() || `HTTP ${res.status}`,
      env.errorCode,
      res.status,
    );
  }
  const data = requireMallObjectData(env);
  return parseCheckoutResponseData(data);
}

async function fetchMallPointsBalanceUncapped(): Promise<PointsBalanceData> {
  const base = await mallBaseOrThrow();
  const res = await fetchWithHttpDebug(`${base}${MALL_POINTS_PATH}`, {
    method: "GET",
    headers: mallAggBearerHeaders(),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 401) {
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  assertMallSuccessHttp(env, res.status);
  // Do not gate on `res.ok` here: some gateways return non-2xx while still echoing a
  // valid ApiEnvelope in the body. Business outcome is `errorCode` + `data` only.
  const data = requireMallObjectData(env);
  return { balance_minor: pointsBalanceMinorFromDataPayload(data) };
}

/** GET `/api/mall-agg/points` — sliding-window cap via `@zhang1career/network`. */
export const fetchMallPointsBalance = wrapAsyncWithRateLimit(
  fetchMallPointsBalanceUncapped,
  { windowMs: 60_000, maxCalls: 30, strategy: "wait" },
  "mall-agg/points",
);

export async function patchMallOrder(
  orderId: number,
  body: { status: number | string },
): Promise<OrderDetail> {
  const base = await mallBaseOrThrow();
  const res = await fetchWithHttpDebug(`${base}${mallOrderPath(orderId)}`, {
    method: "PATCH",
    headers: mallAggJsonBearerHeaders(),
    body: JSON.stringify(body),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 401) {
    throw new Error(env.message?.trim() || "Unauthorized");
  }
  assertMallSuccessHttp(env, res.status);
  if (!res.ok) {
    throw new MallApiError(
      env.message?.trim() || `HTTP ${res.status}`,
      env.errorCode,
      res.status,
    );
  }
  const data = requireMallObjectData(env);
  const row = mallOrderRowFromDetailData(data);
  const linesRaw = Array.isArray(row.lines) ? row.lines : data.lines;
  if (!Array.isArray(linesRaw)) {
    throw new Error("Malformed patch order response");
  }
  const merged: Record<string, unknown> = { ...data, ...row, lines: linesRaw };
  return toOrderDetail(merged);
}

export async function fetchMallOrder(orderId: string): Promise<OrderDetail | null> {
  const base = await mallBaseOrThrow();
  const numId = Number.parseInt(orderId, 10);
  if (!Number.isFinite(numId) || numId < 1) {
    return null;
  }
  const res = await fetchWithHttpDebug(`${base}${mallOrderPath(numId)}`, {
    method: "GET",
    headers: mallAggBearerHeaders(),
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
  const row = mallOrderRowFromDetailData(data);
  const linesRaw = Array.isArray(row.lines) ? row.lines : data.lines;
  if (!Array.isArray(linesRaw)) {
    throw new Error("Malformed order detail");
  }
  const merged: Record<string, unknown> = { ...data, ...row, lines: linesRaw };
  return toOrderDetail(merged);
}
