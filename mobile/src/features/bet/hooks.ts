import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  fetchBetEventDetail,
  fetchBetEventsPage,
  fetchBetMarketDetail,
  fetchBetMarketsPage,
} from "@/lib/api/betCatalogApi";
import {
  fetchBetOrder,
  fetchBetOrdersPage,
  fetchBetPointsBalance,
  placeBetOrder,
} from "@/lib/api/betOrdersApi";
import { useAuthStore } from "@/stores/authStore";

const DEFAULT_PER_PAGE = 15;

/** Infinite pages of `GET /api/bet/games` (Sports tab feed + banner imagery from each row's `banner` / `main_media`). */
export function useBetEventsInfiniteQuery(perPage: number = DEFAULT_PER_PAGE) {
  return useInfiniteQuery({
    queryKey: ["bet-events", "paged", perPage],
    queryFn: ({ pageParam }) => fetchBetEventsPage({ page: pageParam, per_page: perPage }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { current_page, last_page } = last.pagination;
      if (current_page >= last_page) return undefined;
      return current_page + 1;
    },
  });
}

export function useBetEventQuery(eventId: string) {
  const numeric = Number.parseInt(eventId, 10);
  const ok = Number.isFinite(numeric) && numeric >= 1;
  return useQuery({
    queryKey: ["bet-event", eventId],
    queryFn: () => fetchBetEventDetail(numeric),
    enabled: ok,
  });
}

export function useBetMarketsInfiniteQuery(opts: { gameId?: string; perPage?: number } = {}) {
  const numeric = opts.gameId != null && opts.gameId !== "" ? Number.parseInt(opts.gameId, 10) : NaN;
  const game_id = Number.isFinite(numeric) && numeric >= 1 ? numeric : undefined;
  const perPage = opts.perPage ?? DEFAULT_PER_PAGE;
  return useInfiniteQuery({
    queryKey: ["bet-markets", "paged", perPage, game_id ?? "_all"],
    queryFn: ({ pageParam }) =>
      fetchBetMarketsPage({
        page: pageParam,
        per_page: perPage,
        ...(game_id !== undefined ? { game_id } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { current_page, last_page } = last.pagination;
      if (current_page >= last_page) return undefined;
      return current_page + 1;
    },
  });
}

export function useBetMarketQuery(marketId: string) {
  const numeric = Number.parseInt(marketId, 10);
  const ok = Number.isFinite(numeric) && numeric >= 1;
  return useQuery({
    queryKey: ["bet-market", marketId],
    queryFn: () => fetchBetMarketDetail(numeric),
    enabled: ok,
  });
}

export function useBetOrdersInfiniteQuery(perPage: number = DEFAULT_PER_PAGE) {
  const token = useAuthStore((s) => s.accessToken);
  return useInfiniteQuery({
    queryKey: ["bet-orders", "paged", perPage, token],
    queryFn: ({ pageParam }) => {
      if (!token) throw new Error("Not signed in");
      return fetchBetOrdersPage({ page: pageParam, per_page: perPage });
    },
    initialPageParam: 1,
    enabled: !!token,
    getNextPageParam: (last) => {
      const { current_page, last_page } = last.pagination;
      if (current_page >= last_page) return undefined;
      return current_page + 1;
    },
  });
}

export function useBetOrderQuery(orderId: string) {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["bet-order", orderId, token],
    queryFn: () => {
      if (!token) throw new Error("Not signed in");
      return fetchBetOrder(orderId);
    },
    enabled: !!token && !!orderId,
  });
}

export function useBetPointsBalanceQuery() {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["bet-points", token],
    queryFn: () => {
      if (!token) throw new Error("Not signed in");
      return fetchBetPointsBalance();
    },
    enabled: !!token,
  });
}

export { placeBetOrder };
