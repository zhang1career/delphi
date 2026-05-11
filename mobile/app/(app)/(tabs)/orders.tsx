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
import { useWebTopTabBarInset } from "@/lib/navigation/useWebTopTabBarInset";
import { useOrdersInfiniteQuery } from "@/features/orders/hooks";
import { betOrderStatusLabel } from "@/lib/api/betTypes";
import { features } from "@/lib/config";
import { buildLoginHref } from "@/lib/auth/postLoginReturn";
import { useAuthStore } from "@/stores/authStore";

function formatMinor(n: number): string {
  return `$${(n / 100).toFixed(2)}`;
}

function formatTime(sec: number): string {
  try {
    return new Date(sec * 1000).toLocaleString();
  } catch {
    return String(sec);
  }
}

export default function OrdersScreen() {
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
  } = useOrdersInfiniteQuery();
  const rows = data?.pages.flatMap((p) => p.items) ?? [];

  if (!features.orders) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ paddingTop: Platform.OS === "web" ? webNavTop : insets.top }}
      >
        <Text className="text-slate-300 text-center">Orders tab is off in app config features.</Text>
      </View>
    );
  }

  if (!token) {
    return (
      <View
        className="flex-1 bg-surface px-6 justify-center"
        style={{ paddingTop: Platform.OS === "web" ? webNavTop + 8 : insets.top + 8 }}
      >
        <Text className="text-xl font-bold text-slate-100 mb-3">Orders</Text>
        <Text className="text-slate-400 mb-6">Sign in to see your orders.</Text>
        <Pressable
          onPress={() => router.push(buildLoginHref("/(app)/(tabs)/orders"))}
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
      <Text className="text-xl font-bold text-slate-100 px-4 mb-2">Orders</Text>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
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
              {error instanceof Error ? error.message : "Could not load orders."}
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
            <Text className="text-slate-500 px-4">No orders yet.</Text>
          )
        }
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(app)/order/${item.id}`)}
            className="bg-surface-card rounded-xl border border-surface-border p-4 mb-3 active:opacity-90"
          >
            <Text className="text-slate-100 font-semibold">Order #{item.id}</Text>
            <Text className="text-brand-muted text-sm mt-1">{formatMinor(item.total_price)}</Text>
            <Text className="text-slate-400 text-xs mt-1 capitalize">
              {betOrderStatusLabel(item.status)}
            </Text>
            <Text className="text-slate-500 text-xs mt-2">{formatTime(item.ct)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
