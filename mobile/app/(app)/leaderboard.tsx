import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBetLeaderboardInfiniteQuery } from "@/features/bet/hooks";
import { buildLoginHref } from "@/lib/auth/postLoginReturn";
import { useAuthStore } from "@/stores/authStore";
import { useWebTopTabBarInset } from "@/lib/navigation/useWebTopTabBarInset";

export default function LeaderboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webNavTop = useWebTopTabBarInset();
  const token = useAuthStore((s) => s.accessToken);

  const {
    data,
    isPending,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
  } = useBetLeaderboardInfiniteQuery(30);

  const rows = data?.pages.flatMap((p) => p.items) ?? [];

  if (!token) {
    return (
      <View
        className="flex-1 bg-surface px-6 justify-center"
        style={{ paddingTop: Platform.OS === "web" ? webNavTop + 8 : insets.top + 8 }}
      >
        <Text className="text-xl font-bold text-slate-100 mb-3">Leaderboard</Text>
        <Text className="text-slate-400 mb-6">Sign in to view reputation rankings.</Text>
        <Pressable
          onPress={() => router.push(buildLoginHref("/(app)/leaderboard"))}
          className="bg-brand py-3.5 rounded-xl items-center active:opacity-90"
        >
          <Text className="text-white font-semibold text-base">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-surface"
      style={{ paddingTop: Platform.OS === "web" ? webNavTop + 8 : insets.top + 8 }}
    >
      <Text className="text-slate-500 text-xs px-4 mb-2">
        Rankings reflect non-redeemable prediction reputation only.
      </Text>
      <FlatList
        data={rows}
        keyExtractor={(item) => `${item.rank}-${item.uid}`}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#a5b4fc" />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          isError ? (
            <Text className="text-red-400 px-4 mb-2">
              {error instanceof Error ? error.message : "Could not load leaderboard."}
            </Text>
          ) : null
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="#a5b4fc" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isPending ? (
            <View className="py-12 items-center">
              <ActivityIndicator color="#a5b4fc" />
            </View>
          ) : (
            <Text className="text-slate-500 px-4">No rows yet.</Text>
          )
        }
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <View className="bg-surface-card rounded-xl border border-surface-border p-4 mb-2 flex-row justify-between items-center">
            <Text className="text-slate-400 w-10 font-semibold">#{item.rank}</Text>
            <Text className="text-slate-300 flex-1 text-sm">User {item.uid}</Text>
            <Text className="text-slate-100 font-semibold">{item.score}</Text>
          </View>
        )}
      />
    </View>
  );
}
