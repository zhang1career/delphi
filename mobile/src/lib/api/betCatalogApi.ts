import { betPublicJsonHeaders } from "./betAggHeaders";
import type { SportEvent, SportEventSummary, SportMarket, SportSelection } from "./betTypes";
import {
  BET_EVENTS_PATH,
  BET_MARKETS_PATH,
  BET_SELECTIONS_PATH,
  betEventPath,
  betMarketPath,
} from "./betPaths";
import { assertMallSuccess, readMallEnvelope, requireMallObjectData } from "./mallEnvelope";
import { normalizeProductPagination } from "./mallPagination";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { getServiceOrigins } from "@/lib/serviceOrigins";

async function betBase(): Promise<string> {
  const { mallAggBaseUrl } = await getServiceOrigins();
  return mallAggBaseUrl.replace(/\/$/, "");
}

function finiteInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return null;
}

function toEvent(row: Record<string, unknown>): SportEvent {
  const id = finiteInt(row.id);
  const starts_at = finiteInt(row.starts_at);
  const status = finiteInt(row.status);
  const name = typeof row.name === "string" ? row.name : "";
  const ws = row.winning_selection_ids;
  const winning_selection_ids = Array.isArray(ws)
    ? ws.map((x) => finiteInt(x)).filter((x): x is number => x !== null)
    : [];
  if (id === null || starts_at === null || status === null) {
    throw new Error("Malformed event");
  }
  return { id, name, starts_at, status, winning_selection_ids };
}

function toEventSummary(row: Record<string, unknown>): SportEventSummary {
  const id = finiteInt(row.id);
  const starts_at = finiteInt(row.starts_at);
  const status = finiteInt(row.status);
  const name = typeof row.name === "string" ? row.name : "";
  if (id === null || starts_at === null || status === null) {
    throw new Error("Malformed event summary");
  }
  return { id, name, starts_at, status };
}

function toMarket(row: Record<string, unknown>): SportMarket {
  const id = finiteInt(row.id);
  const event_id = finiteInt(row.event_id);
  const market_type = finiteInt(row.market_type);
  const status = finiteInt(row.status);
  if (id === null || event_id === null || market_type === null || status === null) {
    throw new Error("Malformed market");
  }
  const evRaw = row.event;
  let event: SportEventSummary | null | undefined;
  if (evRaw && typeof evRaw === "object" && !Array.isArray(evRaw)) {
    try {
      event = toEventSummary(evRaw as Record<string, unknown>);
    } catch {
      event = undefined;
    }
  }
  return {
    id,
    event_id,
    market_type,
    status,
    ...(event !== undefined ? { event } : {}),
  };
}

function toSelection(row: Record<string, unknown>): SportSelection {
  const id = finiteInt(row.id);
  const label = typeof row.label === "string" ? row.label : "";
  const current_odds_millis = finiteInt(row.current_odds_millis) ?? 0;
  const status = finiteInt(row.status) ?? -1;
  if (id === null) {
    throw new Error("Malformed selection");
  }
  const mk = row.market;
  const ev = row.event;
  const out: SportSelection = {
    id,
    label,
    current_odds_millis,
    status,
    market:
      mk && typeof mk === "object" && !Array.isArray(mk)
        ? {
            id: finiteInt((mk as Record<string, unknown>).id) ?? 0,
            market_type: finiteInt((mk as Record<string, unknown>).market_type) ?? 0,
            status: finiteInt((mk as Record<string, unknown>).status) ?? 0,
          }
        : null,
    event:
      ev && typeof ev === "object" && !Array.isArray(ev)
        ? toEventSummary(ev as Record<string, unknown>)
        : null,
  };
  return out;
}

export type PagedEvents = {
  items: SportEvent[];
  pagination: ReturnType<typeof normalizeProductPagination>;
};

export async function fetchBetEventsPage(params?: { page?: number; per_page?: number }): Promise<PagedEvents> {
  const base = await betBase();
  const qs = new URLSearchParams({
    page: String(params?.page ?? 1),
    per_page: String(params?.per_page ?? 15),
  });
  const res = await fetchWithHttpDebug(`${base}${BET_EVENTS_PATH}?${qs.toString()}`, {
    method: "GET",
    headers: betPublicJsonHeaders(),
  });
  const env = await readMallEnvelope(res);
  if (!res.ok) {
    throw new Error(env.message?.trim() || `HTTP ${res.status}`);
  }
  assertMallSuccess(env);
  const data = requireMallObjectData(env);
  const itemsRaw = data.items as unknown;
  const pagRaw = data.pagination as unknown;
  if (!Array.isArray(itemsRaw) || !pagRaw || typeof pagRaw !== "object" || Array.isArray(pagRaw)) {
    throw new Error("Malformed events list");
  }
  const items = itemsRaw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row))
    .map((row) => toEvent(row));
  const pagination = normalizeProductPagination(pagRaw as Record<string, unknown>);
  return { items, pagination };
}

export async function fetchBetEventDetail(eventId: number): Promise<SportEvent | null> {
  const base = await betBase();
  const res = await fetchWithHttpDebug(`${base}${betEventPath(eventId)}`, {
    method: "GET",
    headers: betPublicJsonHeaders(),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(env.message?.trim() || `HTTP ${res.status}`);
  }
  assertMallSuccess(env);
  const data = requireMallObjectData(env);
  return toEvent(data);
}

export type PagedMarkets = {
  items: SportMarket[];
  pagination: ReturnType<typeof normalizeProductPagination>;
};

export async function fetchBetMarketsPage(params?: {
  page?: number;
  per_page?: number;
  event_id?: number;
}): Promise<PagedMarkets> {
  const base = await betBase();
  const qs = new URLSearchParams({
    page: String(params?.page ?? 1),
    per_page: String(params?.per_page ?? 15),
  });
  const eid = params?.event_id;
  if (eid !== undefined && eid >= 1) {
    qs.set("event_id", String(eid));
  }
  const res = await fetchWithHttpDebug(`${base}${BET_MARKETS_PATH}?${qs.toString()}`, {
    method: "GET",
    headers: betPublicJsonHeaders(),
  });
  const env = await readMallEnvelope(res);
  if (!res.ok) {
    throw new Error(env.message?.trim() || `HTTP ${res.status}`);
  }
  assertMallSuccess(env);
  const data = requireMallObjectData(env);
  const itemsRaw = data.items as unknown;
  const pagRaw = data.pagination as unknown;
  if (!Array.isArray(itemsRaw) || !pagRaw || typeof pagRaw !== "object" || Array.isArray(pagRaw)) {
    throw new Error("Malformed markets list");
  }
  const items = itemsRaw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row))
    .map((row) => toMarket(row));
  const pagination = normalizeProductPagination(pagRaw as Record<string, unknown>);
  return { items, pagination };
}

export async function fetchBetMarketDetail(marketId: number): Promise<SportMarket | null> {
  const base = await betBase();
  const res = await fetchWithHttpDebug(`${base}${betMarketPath(marketId)}`, {
    method: "GET",
    headers: betPublicJsonHeaders(),
  });
  const env = await readMallEnvelope(res);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(env.message?.trim() || `HTTP ${res.status}`);
  }
  assertMallSuccess(env);
  const data = requireMallObjectData(env);
  return toMarket(data);
}

export type PagedSelections = {
  items: SportSelection[];
  pagination: ReturnType<typeof normalizeProductPagination>;
};

export async function fetchBetSelectionsPage(params?: {
  page?: number;
  per_page?: number;
  market_id?: number;
}): Promise<PagedSelections> {
  const base = await betBase();
  const qs = new URLSearchParams({
    page: String(params?.page ?? 1),
    per_page: String(params?.per_page ?? 50),
  });
  const mid = params?.market_id;
  if (mid !== undefined && mid >= 1) {
    qs.set("market_id", String(mid));
  }
  const res = await fetchWithHttpDebug(`${base}${BET_SELECTIONS_PATH}?${qs.toString()}`, {
    method: "GET",
    headers: betPublicJsonHeaders(),
  });
  const env = await readMallEnvelope(res);
  if (!res.ok) {
    throw new Error(env.message?.trim() || `HTTP ${res.status}`);
  }
  assertMallSuccess(env);
  const data = requireMallObjectData(env);
  const itemsRaw = data.items as unknown;
  const pagRaw = data.pagination as unknown;
  if (!Array.isArray(itemsRaw) || !pagRaw || typeof pagRaw !== "object" || Array.isArray(pagRaw)) {
    throw new Error("Malformed selections list");
  }
  const items = itemsRaw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row))
    .map((row) => toSelection(row));
  const pagination = normalizeProductPagination(pagRaw as Record<string, unknown>);
  return { items, pagination };
}
