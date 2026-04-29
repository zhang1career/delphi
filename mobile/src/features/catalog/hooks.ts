import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getCommerceRepo } from "@/lib/api";
import type { Product } from "@/lib/api/types";

const DEFAULT_PER_PAGE = 15;

export function useProductsQuery(opts?: { page?: number; per_page?: number }) {
  const page = opts?.page ?? 1;
  const per_page = opts?.per_page ?? DEFAULT_PER_PAGE;
  return useQuery({
    queryKey: ["products", page, per_page],
    queryFn: () => getCommerceRepo().listProducts({ page, per_page }),
  });
}

export function useProductsInfiniteQuery(perPage: number = DEFAULT_PER_PAGE) {
  return useInfiniteQuery({
    queryKey: ["products", "paged", perPage],
    queryFn: ({ pageParam }) =>
      getCommerceRepo().listProducts({ page: pageParam, per_page: perPage }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { current_page, last_page } = last.pagination;
      if (current_page >= last_page) return undefined;
      return current_page + 1;
    },
  });
}

export function useProductQuery(id: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => getCommerceRepo().getProduct(id),
    enabled: enabled && !!id,
  });
}

function dedupeIdsPreserveOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw?.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Resolves each id via `getProduct`; order matches deduped id list; omits ids that return null. */
export function useProductsByIdsQuery(ids: string[]) {
  const deduped = useMemo(() => dedupeIdsPreserveOrder(ids), [ids]);
  const results = useQueries({
    queries: deduped.map((id) => ({
      queryKey: ["product", id] as const,
      queryFn: () => getCommerceRepo().getProduct(id),
      enabled: deduped.length > 0,
    })),
  });
  const isPending = deduped.length > 0 && results.some((r) => r.isPending);
  const isError = results.some((r) => r.isError);
  const products: Product[] = useMemo(() => {
    const list: Product[] = [];
    for (let i = 0; i < deduped.length; i++) {
      const p = results[i]?.data;
      if (p) {
        list.push(p);
      }
    }
    return list;
  }, [deduped, results]);
  return { products, deduped, isPending, isError };
}
