import type { CommerceRepository, ProductListResult } from "./commerceRepo";
import { assertMallSuccess, readMallEnvelope, requireMallObjectData } from "./mallEnvelope";
import { mallAggBearerHeaders, mallAggJsonBearerHeaders } from "./mallAggHeaders";
import { MALL_PRODUCTS_PATH, MALL_PRODUCTS_SEARCH_PATH, mallProductPath } from "./mallPaths";
import { normalizeProductPagination } from "./mallPagination";
import type { Product } from "./types";
import { mockCommerceRepository } from "./mockCommerce";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { getServiceOrigins } from "@/lib/serviceOrigins";

type CmsProductRecord = Record<string, unknown>;

function splitCommaMedia(raw: string): string[] {
  const s = raw.trim();
  if (!s) {
    return [];
  }
  return s
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function cmsToProduct(row: CmsProductRecord, opts: { includeStock: boolean }): Product {
  const idRaw = row.id;
  const id = typeof idRaw === "number" ? String(idRaw) : String(idRaw ?? "");
  const title = typeof row.title === "string" ? row.title : "";
  const description = typeof row.description === "string" ? row.description : "";
  const thumbnail = typeof row.thumbnail === "string" ? row.thumbnail.trim() : "";
  const mainMedia = typeof row.main_media === "string" ? row.main_media : "";
  const extMedia = typeof row.ext_media === "string" ? row.ext_media : "";
  const mainMediaKeys = splitCommaMedia(mainMedia);
  const extMediaKeys = splitCommaMedia(extMedia);
  const imageUrlRaw = row.image_url;
  const imageUrl =
    typeof imageUrlRaw === "string" && imageUrlRaw.trim() ? imageUrlRaw.trim() : "";
  const price = row.price;
  const priceCents = price === null ? null : typeof price === "number" ? price : null;
  const stockRaw = row.stock_quantity;
  const stockQuantity =
    opts.includeStock && typeof stockRaw === "number" ? stockRaw : undefined;
  return {
    id,
    title,
    description,
    imageUrl,
    priceCents,
    stockQuantity,
    ...(thumbnail ? { thumbnail } : {}),
    ...(mainMediaKeys.length > 0 ? { mainMediaKeys } : {}),
    ...(extMediaKeys.length > 0 ? { extMediaKeys } : {}),
  };
}

async function fetchMallProductsPage(
  base: string,
  params: { page?: number; per_page?: number },
): Promise<ProductListResult> {
  const page = params.page ?? 1;
  const perPage = params.per_page ?? 15;
  const qs = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const res = await fetchWithHttpDebug(`${base}${MALL_PRODUCTS_PATH}?${qs.toString()}`, {
    method: "GET",
    headers: mallAggBearerHeaders(),
  });
  const env = await readMallEnvelope(res);
  if (!res.ok) {
    throw new Error(env.message?.trim() || `HTTP ${res.status}`);
  }
  assertMallSuccess(env);
  const data = requireMallObjectData(env);
  const itemsRaw = data.items;
  const pagRaw = data.pagination;
  if (!Array.isArray(itemsRaw) || !pagRaw || typeof pagRaw !== "object" || Array.isArray(pagRaw)) {
    throw new Error("Malformed product list");
  }
  const items = itemsRaw.map((row) =>
    cmsToProduct(row as CmsProductRecord, { includeStock: false }),
  );
  const pagination = normalizeProductPagination(pagRaw as Record<string, unknown>);
  return { items, pagination };
}

function searchHitToProductId(hit: unknown): string | null {
  if (typeof hit === "number" && Number.isFinite(hit)) {
    return String(Math.trunc(hit));
  }
  if (typeof hit === "string") {
    const t = hit.trim();
    return t.length > 0 ? t : null;
  }
  if (!hit || typeof hit !== "object" || Array.isArray(hit)) {
    return null;
  }
  const row = hit as Record<string, unknown>;
  const candidates = [row.product_id, row.productId, row.id];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) {
      return String(Math.trunc(c));
    }
    if (typeof c === "string") {
      const t = c.trim();
      if (t.length > 0) {
        return t;
      }
    }
  }
  return null;
}

function searchResultIdsFromData(data: Record<string, unknown>): string[] {
  const itemsRaw = data.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }
  const out: string[] = [];
  for (const hit of itemsRaw) {
    const id = searchHitToProductId(hit);
    if (id) {
      out.push(id);
    }
  }
  return out;
}

async function postMallProductSearch(base: string, query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const res = await fetchWithHttpDebug(`${base}${MALL_PRODUCTS_SEARCH_PATH}`, {
    method: "POST",
    headers: mallAggJsonBearerHeaders(),
    body: JSON.stringify({ query: trimmed }),
  });
  const env = await readMallEnvelope(res);
  if (!res.ok) {
    throw new Error(env.message?.trim() || `HTTP ${res.status}`);
  }
  assertMallSuccess(env);
  const data = requireMallObjectData(env);
  return searchResultIdsFromData(data);
}

async function fetchMallProduct(base: string, id: string): Promise<Product | null> {
  const numId = Number.parseInt(id, 10);
  if (!Number.isFinite(numId) || numId < 1) {
    return null;
  }
  const res = await fetchWithHttpDebug(`${base}${mallProductPath(numId)}`, {
    method: "GET",
    headers: mallAggBearerHeaders(),
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
  return cmsToProduct(data, { includeStock: true });
}

export function createMallCommerceRepository(baseRaw: string): CommerceRepository {
  const base = baseRaw.replace(/\/$/, "");
  return {
    listProducts: (p) => fetchMallProductsPage(base, p ?? {}),
    getProduct: (id) => fetchMallProduct(base, id),
    searchProductIds: (q) => postMallProductSearch(base, q),
    listFeed: () => mockCommerceRepository.listFeed(),
  };
}

export function createDefaultCommerceRepository(): CommerceRepository {
  return {
    async listProducts(params) {
      const { mallAggBaseUrl } = await getServiceOrigins();
      return fetchMallProductsPage(mallAggBaseUrl.replace(/\/$/, ""), params ?? {});
    },
    async getProduct(id) {
      const { mallAggBaseUrl } = await getServiceOrigins();
      return fetchMallProduct(mallAggBaseUrl.replace(/\/$/, ""), id);
    },
    async searchProductIds(query) {
      const { mallAggBaseUrl } = await getServiceOrigins();
      return postMallProductSearch(mallAggBaseUrl.replace(/\/$/, ""), query);
    },
    listFeed: () => mockCommerceRepository.listFeed(),
  };
}
