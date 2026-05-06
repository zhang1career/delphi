import { betPublicJsonHeaders } from "./betAggHeaders";
import type { SportEvent, SportEventSummary, SportMarket, SportSelection } from "./betTypes";
import { BET_GAMES_PATH, BET_MARKETS_PATH, betGamePath, betMarketPath } from "./betPaths";
import { assertMallSuccess, readMallEnvelope, requireMallObjectData } from "./mallEnvelope";
import { normalizeProductPagination } from "./mallPagination";
import { betGameAssetCdnUriWithBase } from "@/lib/betCdn";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { getServiceOrigins } from "@/lib/serviceOrigins";

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

function toEvent(row: Record<string, unknown>): SportEvent {
  const id = finiteInt(row.id);
  const startsRaw = finiteInt(row.starts_at);
  const starts_at = startsRaw !== null ? startsRaw : 0;
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
  const startsRaw = finiteInt(row.starts_at);
  const starts_at = startsRaw !== null ? startsRaw : 0;
  const status = finiteInt(row.status);
  const name = eventRowDisplayName(row);
  if (id === null || status === null) {
    throw new Error("Malformed event summary");
  }
  return { id, name, starts_at, status };
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
      .map((r) => toSelection(r));
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

function toSelection(row: Record<string, unknown>): SportSelection {
  const id = finiteInt(row.id);
  const label = typeof row.label === "string" ? row.label : "";
  const current_odds_millis = finiteInt(row.current_odds_millis) ?? 0;
  const status = finiteInt(row.status) ?? -1;
  if (id === null) {
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
    label,
    current_odds_millis,
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

/** `group_code` query value for `GET /api/bet/games` on the Games (Sports) home list. */
export const BET_GAMES_GROUP_CODE_FIFA_2026 = "fifa-2026-group";

/** `GET /api/bet/games` — paged catalog games. Items may include `banner` and `main_media` (resolved with mall CDN base into `bannerCdnUrl`); Sports tab carousel uses this list. */
export async function fetchBetEventsPage(params?: {
  page?: number;
  per_page?: number;
  group_code?: string;
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

