import type { MarketQuoteSnapshot } from "./marketQuote";
import type { OrderPagination as ListPagination } from "./orderTypes";

export type { ListPagination };
export type { MarketQuoteSnapshot, MarketQuoteOutcome, MarketQuoteBatchItem, MarketQuoteHistoryInterval } from "./marketQuote";
export { MARKET_QUOTES_BATCH_MAX, emptyMarketQuoteSnapshot, formatShareBp, quoteOutcomeByCode } from "./marketQuote";

export type SportEvent = {
  id: number;
  /** Display label; from API `title` or legacy `name`. */
  name: string;
  /** Kickoff time in ms; `0` when the games API omits schedule fields. */
  starts_at: number;
  /** 1 = open, 2 = closed, 3 = settled */
  status: number;
  winning_selection_ids: number[];
  /** Banner object key under CDN distribution when relative (e.g. `banner/…`); or absolute image URL. */
  banner?: string;
  /** Main image key under CDN distribution when relative; or absolute URL. */
  main_media?: string;
  /** Resolved banner/main image URL from `mallCdnBaseUrl` (set by list/detail fetch). */
  bannerCdnUrl?: string;
};

export type SportEventSummary = {
  id: number;
  /** From API `title` or `name`. */
  name: string;
  /** Kickoff Unix ms; `0` if omitted on embedded `game` (e.g. `GET /api/bet/markets`). */
  starts_at: number;
  status: number;
  /** Resolved from `game.side_a_icon` via mall CDN; `null` → UI placeholder. */
  side_a_icon_url: string | null;
  /** Resolved from `game.side_b_icon` via mall CDN; `null` → UI placeholder. */
  side_b_icon_url: string | null;
};

export type SportMarket = {
  id: number;
  /** CMS / catalog game id (`biz_market.game_id`). */
  game_id: number;
  /** Catalog market type id. */
  type?: number;
  /** Local display label on `biz_market`. */
  name: string;
  status: number;
  /** Updated-at epoch ms from bet-agg. */
  ut?: number;
  /** Crowd pick snapshot; list when `include=quote`, always on detail. */
  quote?: MarketQuoteSnapshot;
  /** From `data._dict.market_status` on `GET /api/bet/markets` when present. */
  market_status_label?: string;
  /** Present on `GET /api/bet/markets/{id}`; list `GET /api/bet/markets` may omit this field. */
  selections?: SportSelection[];
  game?: SportEventSummary | null;
};

/** Synthetic leg from catalog: `code` / `outcome_code` maps to submit `outcome_code`. */
export type SportSelection = {
  id: number;
  outcome_code: string;
  label: string;
  status: number;
  market?: {
    id: number;
    name: string;
    status: number;
  } | null;
  game?: SportEventSummary | null;
};

export type BetOrderLine = {
  market_id: number;
  /** Outcome code persisted for the line (API `selection`). */
  selection: string;
  pick_label?: string;
  result?: number;
  /** From `_dict.order_item_result` when present. */
  result_label?: string;
};

export type BetOrderFull = {
  id: number;
  uid: number;
  status: number;
  ct: number;
  ut: number;
  lines: BetOrderLine[];
  /** Resolved via `_dict.bet_order_status` when the server sends it. */
  status_label?: string;
};

export type BetOrderSummary = {
  id: number;
  uid: number;
  status: number;
  ct: number;
  ut: number;
};

export type BetOrderListResult = {
  items: BetOrderSummary[];
  pagination: ListPagination;
};

/** Body line for `POST /api/bet/place` (server accepts exactly one line). */
export type BetSubmitLine = {
  market_id: number;
  outcome_code: string;
};

export type ReputationData = {
  score: number;
};

export type LeaderboardRow = {
  rank: number;
  uid: number;
  score: number;
};

export type LeaderboardListResult = {
  items: LeaderboardRow[];
  pagination: ListPagination;
};

/** Fallback status text when `_dict` is not on the response. */
export function betOrderStatusLabel(status: number): string {
  const known: Record<number, string> = {
    0: "Pending",
    1: "Recorded",
    2: "Accepted",
    3: "Cancelled",
    4: "Correct",
    5: "Incorrect",
    6: "Void",
  };
  return known[status] ?? `status_${String(status)}`;
}
