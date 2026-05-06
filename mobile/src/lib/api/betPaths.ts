/** bet-agg catalog and orders under API gateway base URL. */

export const BET_DICT_PATH = "/api/bet/dict";

export const BET_GAMES_PATH = "/api/bet/games";

export function betGamePath(gameId: number): string {
  return `/api/bet/games/${gameId}`;
}

export const BET_MARKETS_PATH = "/api/bet/markets";

export function betMarketPath(marketId: number): string {
  return `/api/bet/markets/${marketId}`;
}

export const BET_ORDERS_PATH = "/api/bet/orders";

export function betOrderPath(orderId: number): string {
  return `/api/bet/orders/${orderId}`;
}

/** Issued before `POST /api/bet/place` as `X-Request-Id`. */
export const SNOWFLAKE_ID_PATH = "/api/snowflake/id";

/** Single-step create + settle (stake debit); replaces draft `POST /api/bet/orders` + `POST /api/bet/checkout`. */
export const BET_PLACE_PATH = "/api/bet/place";

export const BET_POINTS_PATH = "/api/bet/points";
