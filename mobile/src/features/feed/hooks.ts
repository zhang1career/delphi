import { useQuery } from "@tanstack/react-query";
import { getCommerceRepo } from "@/lib/api";

export function useFeedQuery() {
  return useQuery({
    queryKey: ["feed"],
    queryFn: () => getCommerceRepo().listFeed(),
  });
}
