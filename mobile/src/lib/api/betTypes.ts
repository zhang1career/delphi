import type { OrderPagination as ListPagination } from "./orderTypes";

export type { ListPagination };

export type SportEvent = {
  id: number;
  name: string;
  /** Unix time in milliseconds */
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
  name: string;
  starts_at: number;
  status: number;
};

export type SportMarket = {
  id: number;
  /** CMS / catalog game id (`biz_market.game_id`). */
  game_id: number;
  /** Local display label on `biz_market`. */
  name: string;
  status: number;
  game?: SportEventSummary | null;
};

export type SportSelection = {
  id: number;
  label: string;
  current_odds_millis: number;
  status: number;
  market?: {
    id: number;
    name: string;
    status: number;
  } | null;
  game?: SportEventSummary | null;
};

export type BetOrderLine = {
  kid: number;
  stake_points: number;
  decimal_odds_millis?: number;
  potential_return_points?: number;
  odds_snapshot?: unknown;
  /** 0 pending, 1 win, 2 lose, 3 void */
  result?: number;
};

export type BetOrderFull = {
  id: number;
  uid: number;
  status: number;
  total_price: number;
  /** Stake held from points wallet after checkout (normally equals `total_price`). */
  points_held: number;
  ct: number;
  ut: number;
  lines: BetOrderLine[];
  ext_inventory?: unknown;
  ext_id?: unknown;
  /** CheckoutPhase: 0 draft, 50 await payment (reserved), 60 completed. */
  checkout_phase?: number;
};

export type BetOrderSummary = {
  id: number;
  uid: number;
  status: number;
  total_price: number;
  ct: number;
  ut: number;
};

export type BetOrderListResult = {
  items: BetOrderSummary[];
  pagination: ListPagination;
};

export type CreateBetOrderLine = {
  kid: number;
  stake_points: number;
};

export function betOrderStatusLabel(status: number): string {
  const known: Record<number, string> = {
    0: "pending",
    1: "paid",
    2: "accepted",
    3: "cancelled",
    4: "won",
    5: "lost",
    6: "void",
  };
  return known[status] ?? `status_${String(status)}`;
}

/** Display decimal odds from `decimal_odds_millis` (e.g. 1850 → 1.85). */
export function formatDecimalOddsFromMillis(millis: number | undefined): string {
  if (millis === undefined || !Number.isFinite(millis)) {
    return "—";
  }
  return (millis / 1000).toFixed(2);
}
