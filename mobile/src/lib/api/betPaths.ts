/** bet-agg catalog and orders under API gateway base URL. */

export const BET_DICT_PATH = "/api/bet/dict";

export const BET_EVENTS_PATH = "/api/bet/events";

export function betEventPath(eventId: number): string {
  return `/api/bet/events/${eventId}`;
}

export const BET_MARKETS_PATH = "/api/bet/markets";

export function betMarketPath(marketId: number): string {
  return `/api/bet/markets/${marketId}`;
}

export const BET_SELECTIONS_PATH = "/api/bet/selections";

export function betSelectionPath(selectionId: number): string {
  return `/api/bet/selections/${selectionId}`;
}

export const BET_ORDERS_PATH = "/api/bet/orders";

export function betOrderPath(orderId: number): string {
  return `/api/bet/orders/${orderId}`;
}

export const BET_CHECKOUT_PATH = "/api/bet/checkout";

export const BET_POINTS_PATH = "/api/bet/points";
