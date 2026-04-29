import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useBetEventQuery,
  useBetMarketsInfiniteQuery,
} from "@/features/bet/hooks";
import type { SportMarket } from "@/lib/api/betTypes";
import { features } from "@/lib/config";

function fmtMs(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

function Row({ item, onPress }: { item: SportMarket; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-3 bg-surface-card rounded-xl border border-surface-border p-4 active:opacity-90"
    >
      <Text className="text-slate-100 font-semibold">Market #{item.id}</Text>
      <Text className="text-slate-500 text-xs mt-1">
        Market type · {item.market_type} · status {item.status}
      </Text>
    </Pressable>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const eventQ = useBetEventQuery(id ?? "");
  const marketsQ = useBetMarketsInfiniteQuery({ eventId: id ?? "" });

  const ev = eventQ.data;
  const rows = marketsQ.data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    if (typeof ev?.name === "string" && ev.name.trim()) {
      navigation.setOptions({ title: ev.name });
    }
  }, [navigation, ev?.name]);

  if (!features.commerce) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ paddingTop: insets.top }}>
        <Text className="text-slate-300 text-center">Catalog is off.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 12 }}
      refreshControl={
        <RefreshControl
          refreshing={eventQ.isRefetching || marketsQ.isRefetching}
          onRefresh={() => {
            void eventQ.refetch();
            void marketsQ.refetch();
          }}
        />
      }
      ListHeaderComponent={
        <>
          {eventQ.isPending ? (
            <View className="py-12 items-center">
              <ActivityIndicator color="#a5b4fc" />
            </View>
          ) : eventQ.error ? (
            <Text className="text-red-400 px-4">
              {eventQ.error instanceof Error ? eventQ.error.message : "Load failed"}
            </Text>
          ) : ev ? (
            <View className="mx-4 mb-4 px-4 py-3 rounded-xl bg-surface-card border border-surface-border">
              <Text className="text-slate-400 text-xs">Starts</Text>
              <Text className="text-slate-100 mt-1">{fmtMs(ev.starts_at)}</Text>
              <Text className="text-slate-400 text-xs mt-3">Status</Text>
              <Text className="text-slate-200 mt-1">{ev.status}</Text>
            </View>
          ) : (
            <Text className="text-slate-500 px-4">Event not found.</Text>
          )}
          <Text className="text-slate-200 font-semibold px-4 mb-2">Markets</Text>
        </>
      }
      onEndReached={() => {
        if (marketsQ.hasNextPage && !marketsQ.isFetchingNextPage) {
          void marketsQ.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        !marketsQ.isPending ? (
          <Text className="text-slate-500 px-4">No markets for this event.</Text>
        ) : (
          <View className="py-8 items-center">
            <ActivityIndicator color="#a5b4fc" />
          </View>
        )
      }
      ListFooterComponent={
        marketsQ.isFetchingNextPage ? (
          <View className="py-4 items-center">
            <ActivityIndicator color="#a5b4fc" />
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Row item={item} onPress={() => router.push(`/(app)/market/${item.id}`)} />
      )}
    />
  );
}
