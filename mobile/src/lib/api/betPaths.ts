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

/** Mint decimal id for `X-Request-Id` before `POST /api/bet/submit`. */
export const BET_SNOWFLAKE_PATH = "/api/bet/snowflake";

export const BET_SUBMIT_PATH = "/api/bet/submit";

export const BET_REPUTATION_PATH = "/api/bet/reputation";

export const BET_LEADERBOARD_PATH = "/api/bet/leaderboard";
