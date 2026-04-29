import type { OrderPagination } from "./orderTypes";
import type { ProductPagination } from "./commerceRepo";

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Laravel / CMS pagination keys may vary slightly. */
export function normalizeProductPagination(raw: Record<string, unknown>): ProductPagination {
  return {
    total: num(raw.total) ?? 0,
    per_page: num(raw.per_page) ?? num(raw.perPage) ?? 15,
    current_page: num(raw.current_page) ?? num(raw.currentPage) ?? 1,
    last_page: num(raw.last_page) ?? num(raw.lastPage) ?? 1,
  };
}

export function normalizeOrderPagination(raw: Record<string, unknown>): OrderPagination {
  const p = normalizeProductPagination(raw);
  return p;
}
