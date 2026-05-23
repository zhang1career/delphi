import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  fetchBetEventDetail,
  fetchBetEventsPage,
  fetchBetMarketDetail,
  fetchBetMarketQuoteHistory,
  fetchBetMarketQuotes,
  fetchBetMarketsPage,
} from "@/lib/api/betCatalogApi";
import type { MarketQuoteHistoryInterval } from "@/lib/api/marketQuote";
import { fetchBannerGroupCode } from "@/lib/api/configApi";
import {
  fetchBetLeaderboardPage,
  fetchBetOrder,
  fetchBetOrdersPage,
  fetchBetReputation,
  submitBetOrder,
} from "@/lib/api/betOrdersApi";
import { useAuthStore } from "@/stores/authStore";

const DEFAULT_PER_PAGE = 15;
const MARKET_QUOTE_HISTORY_REFRESH_MS = 5 * 60 * 1000;

/** Config center `key=data` → `banners.code` for home banner carousel `group_code`. */
export function useBannerGroupCodeQuery() {
  return useQuery({
    queryKey: ["app-config", "data", "banners", "code"],
    queryFn: fetchBannerGroupCode,
    staleTime: 5 * 60 * 1000,
  });
}

/** Infinite pages of `GET /api/bet/games` (events home + banner imagery). Default `status=1`. */
export function useBetEventsInfiniteQuery(
  perPage: number = DEFAULT_PER_PAGE,
  options?: { group_code?: string; status?: number | null; enabled?: boolean },
) {
  const group_code = options?.group_code?.trim();
  const statusKey =
    options?.status === undefined ? 1 : options?.status === null ? "all" : options.status;
  return useInfiniteQuery({
    queryKey: ["bet-events", "paged", perPage, group_code ?? "_none", statusKey],
    queryFn: ({ pageParam }) =>
      fetchBetEventsPage({
        page: pageParam,
        per_page: perPage,
        ...(group_code ? { group_code } : {}),
        ...(options?.status !== undefined ? { status: options.status } : {}),
      }),
    initialPageParam: 1,
    enabled: options?.enabled !== false,
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

export function useBetMarketsInfiniteQuery(
  opts: { gameId?: string; perPage?: number; includeQuote?: boolean } = {},
) {
  const numeric = opts.gameId != null && opts.gameId !== "" ? Number.parseInt(opts.gameId, 10) : NaN;
  const game_id = Number.isFinite(numeric) && numeric >= 1 ? numeric : undefined;
  const perPage = opts.perPage ?? DEFAULT_PER_PAGE;
  const includeQuote = opts.includeQuote !== false;
  return useInfiniteQuery({
    queryKey: ["bet-markets", "paged", perPage, game_id ?? "_all", includeQuote ? "quote" : "_noquote"],
    queryFn: ({ pageParam }) =>
      fetchBetMarketsPage({
        page: pageParam,
        per_page: perPage,
        ...(game_id !== undefined ? { game_id } : {}),
        ...(includeQuote ? { include_quote: true } : {}),
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

/** Batch refresh `GET /api/bet/markets/quotes` for visible market ids (max 100 per request, chunked). */
export function useBetMarketQuotesQuery(
  marketIds: number[],
  options?: { enabled?: boolean; refetchInterval?: number | false },
) {
  const idsKey = [...new Set(marketIds.filter((id) => Number.isFinite(id) && id >= 1))].sort((a, b) => a - b);
  return useQuery({
    queryKey: ["bet-market-quotes", idsKey.join(",")],
    queryFn: () => fetchBetMarketQuotes(idsKey),
    enabled: (options?.enabled !== false) && idsKey.length > 0,
    refetchInterval: options?.refetchInterval,
  });
}

export function useBetMarketQuoteHistoryQuery(
  marketId: string,
  options?: {
    interval?: MarketQuoteHistoryInterval;
    from?: number;
    to?: number;
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number | false;
  },
) {
  const numeric = Number.parseInt(marketId, 10);
  const ok = Number.isFinite(numeric) && numeric >= 1;
  const interval = options?.interval ?? "1h";
  const refreshMs = options?.staleTime ?? MARKET_QUOTE_HISTORY_REFRESH_MS;
  return useQuery({
    queryKey: ["bet-market-quote-history", marketId, interval, options?.from ?? "_", options?.to ?? "_"],
    queryFn: () =>
      fetchBetMarketQuoteHistory(numeric, {
        interval,
        ...(options?.from !== undefined ? { from: options.from } : {}),
        ...(options?.to !== undefined ? { to: options.to } : {}),
      }),
    enabled: (options?.enabled !== false) && ok,
    staleTime: refreshMs,
    gcTime: refreshMs * 2,
    refetchInterval: options?.refetchInterval ?? MARKET_QUOTE_HISTORY_REFRESH_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

export function useBetReputationQuery() {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["bet-reputation", token],
    queryFn: () => {
      if (!token) throw new Error("Not signed in");
      return fetchBetReputation();
    },
    enabled: !!token,
  });
}

export function useBetLeaderboardInfiniteQuery(perPage: number = DEFAULT_PER_PAGE) {
  const token = useAuthStore((s) => s.accessToken);
  return useInfiniteQuery({
    queryKey: ["bet-leaderboard", "paged", perPage, token],
    queryFn: ({ pageParam }) => {
      if (!token) throw new Error("Not signed in");
      return fetchBetLeaderboardPage({ page: pageParam, per_page: perPage });
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

export { submitBetOrder };
