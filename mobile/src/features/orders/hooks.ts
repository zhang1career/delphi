import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchBetOrder, fetchBetOrdersPage } from "@/lib/api/betOrdersApi";
import { fetchMallPointsBalance } from "@/lib/api/mallOrdersApi";
import { useAuthStore } from "@/stores/authStore";

const DEFAULT_PER_PAGE = 15;

/** Paginated prediction orders (`GET /api/bet/orders`). */
export function useOrdersInfiniteQuery(perPage: number = DEFAULT_PER_PAGE) {
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

/** Single prediction order detail. */
export function useOrderQuery(orderId: string) {
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

/** Mall redeemable points balance for checkout (`GET /api/mall-agg/points`). */
export function useMallPointsBalanceQuery() {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["mall-points", token],
    queryFn: () => {
      if (!token) throw new Error("Not signed in");
      return fetchMallPointsBalance();
    },
    enabled: !!token,
  });
}
