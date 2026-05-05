/** Mall-agg product routes via API gateway (`http://{config host}` → nginx :80 → gateway). */
export const MALL_PRODUCTS_PATH = "/api/mall-agg/products";

/** POST body must match backend `ProductSearchRequest` (forwarded to SearchRec). */
export const MALL_PRODUCTS_SEARCH_PATH = "/api/mall-agg/products/search";

export function mallProductPath(id: number): string {
  return `/api/mall-agg/products/${id}`;
}

export const MALL_ORDERS_PATH = "/api/mall-agg/orders";

export function mallOrderPath(id: number): string {
  return `/api/mall-agg/orders/${id}`;
}

export const MALL_CHECKOUT_PATH = "/api/mall-agg/checkout";

export const MALL_POINTS_PATH = "/api/mall-agg/points";
