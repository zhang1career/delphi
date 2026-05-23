import { betPublicJsonHeaders } from "./betAggHeaders";
import type { SportEvent, SportEventSummary, SportMarket, SportSelection } from "./betTypes";
import { BET_GAMES_PATH, BET_MARKETS_PATH, betGamePath, betMarketPath } from "./betPaths";
import { assertMallSuccess, readMallEnvelope, requireMallObjectData } from "./mallEnvelope";
import { normalizeProductPagination } from "./mallPagination";
import { betGameAssetCdnUriWithBase } from "@/lib/betCdn";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { getServiceOrigins } from "@/lib/serviceOrigins";
import { surrogateSelectionKidFromMarketOutcome } from "@/lib/api/betSelectionKid";

async function betBase(): Promise<string> {
  const { mallAggBaseUrl } = await getServiceOrigins();
  return mallAggBaseUrl.replace(/\/$/, "");
}

function attachBetEventBannerCdn(ev: SportEvent, cdnBase: string): SportEvent {
  const url =
    betGameAssetCdnUriWithBase(cdnBase, ev.banner) ?? betGameAssetCdnUriWithBase(cdnBase, ev.main_media);
  if (!url) {
    return ev;
  }
  return { ...ev, bannerCdnUrl: url };
}

function finiteInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

function eventRowDisplayName(row: Record<string, unknown>): string {
  const title = row.title;
  if (typeof title === "string" && title.trim().length > 0) {
    return title.trim();
  }
  const name = row.name;
  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim();
  }
  return "";
}

function kickoffMsFromRow(row: Record<string, unknown>): number {
  const startsRaw = finiteInt(row.starts_at);
  if (startsRaw !== null) {
    return startsRaw;
  }
  const legacy = finiteInt(row.start_at);
  return legacy !== null ? legacy : 0;
}

function toEvent(row: Record<string, unknown>): SportEvent {
  const id = finiteInt(row.id);
  const starts_at = kickoffMsFromRow(row);
  const status = finiteInt(row.status);
  const name = eventRowDisplayName(row);
  const ws = row.winning_selection_ids;
  const winning_selection_ids = Array.isArray(ws)
    ? ws.map((x) => finiteInt(x)).filter((x): x is number => x !== null)
    : [];
  if (id === null || status === null) {
    throw new Error("Malformed event");
  }
  const bannerRaw = row.banner;
  const banner =
    typeof bannerRaw === "string" && bannerRaw.trim().length > 0 ? bannerRaw.trim() : undefined;
  const mainMediaRaw = row.main_media;
  const main_media =
    typeof mainMediaRaw === "string" && mainMediaRaw.trim().length > 0
      ? mainMediaRaw.trim()
      : undefined;
  return {
    id,
    name,
    starts_at,
    status,
    winning_selection_ids,
    ...(banner !== undefined ? { banner } : {}),
    ...(main_media !== undefined ? { main_media } : {}),
  };
}

function toEventSummary(row: Record<string, unknown>): SportEventSummary {
  const id = finiteInt(row.id);
  const starts_at = kickoffMsFromRow(row);
  const status = finiteInt(row.status);
  const name = eventRowDisplayName(row);
  if (id === null || status === null) {
    throw new Error("Malformed event summary");
  }
  return { id, name, starts_at, status };
}

function selectionNumericIdFromRow(row: Record<string, unknown>): number | null {
  const keys = ["id", "kid", "selection_id"] as const;
  for (const k of keys) {
    const n = finiteInt(row[k]);
    if (n !== null) {
      return n;
    }
  }
  return null;
}

function toMarket(row: Record<string, unknown>): SportMarket {
  const id = finiteInt(row.id);
  const game_id = finiteInt(row.game_id);
  const status = finiteInt(row.status);
  const name = typeof row.name === "string" ? row.name : "";
  if (id === null || game_id === null || status === null) {
    throw new Error("Malformed market");
  }
  const gameRaw = row.game;
  let game: SportEventSummary | null | undefined;
  if (gameRaw && typeof gameRaw === "object" && !Array.isArray(gameRaw)) {
    try {
      game = toEventSummary(gameRaw as Record<string, unknown>);
    } catch {
      game = undefined;
    }
  }
  const selRaw = row.selections;
  let selections: SportSelection[] | undefined;
  if (Array.isArray(selRaw)) {
    selections = selRaw
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r))
      .map((r) => toSelection(r, id));
  }
  return {
    id,
    game_id,
    name,
    status,
    ...(selections !== undefined ? { selections } : {}),
    ...(game !== undefined ? { game } : {}),
  };
}

/** `data._dict.market_status`: `{ k: label, v: status code }[]` → numeric code → label. */
function marketStatusLabelsFromPageData(data: Record<string, unknown>): Map<number, string> | null {
  const dictRoot = data._dict;
  if (!dictRoot || typeof dictRoot !== "object" || Array.isArray(dictRoot)) {
    return null;
  }
  const rows = (dictRoot as Record<string, unknown>).market_status;
  if (!Array.isArray(rows)) {
    return null;
  }
  const map = new Map<number, string>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      continue;
    }
    const o = row as Record<string, unknown>;
    const labelRaw = o.k;
    const codeNum = finiteInt(o.v);
    if (typeof labelRaw !== "string" || labelRaw.trim().length === 0 || codeNum === null) {
      continue;
    }
    map.set(codeNum, labelRaw.trim());
  }
  return map.size > 0 ? map : null;
}

function attachMarketStatusLabels(items: SportMarket[], map: Map<number, string> | null): SportMarket[] {
  if (!map) {
    return items;
  }
  return items.map((m) => {
    const label = map.get(m.status);
    return label !== undefined ? { ...m, market_status_label: label } : m;
  });
}

function toSelection(row: Record<string, unknown>, marketId: number): SportSelection {
  let id = selectionNumericIdFromRow(row);
  const codeRaw = row.code ?? row.outcome_code;
  const outcome_code =
    typeof codeRaw === "string" && codeRaw.trim().length > 0 ? codeRaw.trim() : undefined;
  if (id === null && outcome_code !== undefined) {
    id = surrogateSelectionKidFromMarketOutcome(marketId, outcome_code);
  }
  const label = typeof row.label === "string" ? row.label : "";
  const status = finiteInt(row.status) ?? -1;
  if (id === null || outcome_code === undefined) {
    throw new Error("Malformed selection");
  }
  const mk = row.market;
  const gameRaw = row.game;
  let game: SportEventSummary | null = null;
  if (gameRaw && typeof gameRaw === "object" && !Array.isArray(gameRaw)) {
    try {
      game = toEventSummary(gameRaw as Record<string, unknown>);
    } catch {
      game = null;
    }
  }
  const out: SportSelection = {
    id,
    outcome_code,
    label,
    status,
    market:
      mk && typeof mk === "object" && !Array.isArray(mk)
        ? {
            id: finiteInt((mk as Record<string, unknown>).id) ?? 0,
            name:
              typeof (mk as Record<string, unknown>).name === "string"
                ? ((mk as Record<string, unknown>).name as string)
                : "",
            status: finiteInt((mk as Record<string, unknown>).status) ?? 0,
          }
        : null,
    game,
  };
  return out;
}

export type PagedEvents = {
  items: SportEvent[];
  pagination: ReturnType<typeof normalizeProductPagination>;
};

/** `GET /api/bet/games` — paged catalog games. Items may include `banner` and `main_media` (resolved with mall CDN base into `bannerCdnUrl`); Sports tab carousel uses this list. */
export async function fetchBetEventsPage(params?: {
  page?: number;
  per_page?: number;
  group_code?: string;
  /**
   * Filter by game status (e.g. `1` = open). Defaults to `1` when omitted.
   * Pass `null` to omit the query parameter (all statuses, if the server allows).
   */
  status?: number | null;
}): Promise<PagedEvents> {
  const { mallAggBaseUrl, mallCdnBaseUrl } = await getServiceOrigins();
  const base = mallAggBaseUrl.replace(/\/$/, "");
  const cdnBase = mallCdnBaseUrl.replace(/\/$/, "");
  const qs = new URLSearchParams({
    page: String(params?.page ?? 1),
    per_page: String(params?.per_page ?? 15),
  });
  const group_code = params?.group_code?.trim();
  if (group_code) {
    qs.set("group_code", group_code);
  }
  const rawStatus = params?.status;
  const status = rawStatus === undefined ? 1 : rawStatus;
  if (status !== null) {
    qs.set("status", String(status));
  }
  const res = await fetchWithHttpDebug(`${base}${BET_GAMES_PATH}?${qs.toString()}`, {
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
    .map((row) => attachBetEventBannerCdn(toEvent(row), cdnBase));
  const pagination = normalizeProductPagination(pagRaw as Record<string, unknown>);
  return { items, pagination };
}

/** `GET /api/bet/games/{id}` — same optional `banner` / `main_media` semantics as list items. */
export async function fetchBetEventDetail(eventId: number): Promise<SportEvent | null> {
  const { mallAggBaseUrl, mallCdnBaseUrl } = await getServiceOrigins();
  const base = mallAggBaseUrl.replace(/\/$/, "");
  const cdnBase = mallCdnBaseUrl.replace(/\/$/, "");
  const res = await fetchWithHttpDebug(`${base}${betGamePath(eventId)}`, {
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
  return attachBetEventBannerCdn(toEvent(data), cdnBase);
}

export type PagedMarkets = {
  items: SportMarket[];
  pagination: ReturnType<typeof normalizeProductPagination>;
};

export async function fetchBetMarketsPage(params?: {
  page?: number;
  per_page?: number;
  game_id?: number;
  /**
   * Filter by market status (e.g. `1` = open). Defaults to `1` when omitted.
   * Pass `null` to omit the query parameter (all statuses, if the server allows).
   */
  status?: number | null;
}): Promise<PagedMarkets> {
  const base = await betBase();
  const qs = new URLSearchParams({
    page: String(params?.page ?? 1),
    per_page: String(params?.per_page ?? 15),
  });
  const gid = params?.game_id;
  if (gid !== undefined && gid >= 1) {
    qs.set("game_id", String(gid));
  }
  const rawStatus = params?.status;
  const status = rawStatus === undefined ? 1 : rawStatus;
  if (status !== null) {
    qs.set("status", String(status));
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
  const items = attachMarketStatusLabels(
    itemsRaw
      .filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row))
      .map((row) => toMarket(row)),
    marketStatusLabelsFromPageData(data),
  );
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

