import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BannerSlide } from "@/components/app/BannerCarousel";
import { BannerCarousel } from "@/components/app/BannerCarousel";
import { useBetEventsInfiniteQuery, useBetMarketsInfiniteQuery } from "@/features/bet/hooks";
import type { SportMarket } from "@/lib/api/betTypes";
import { features } from "@/lib/config";

function MarketRow({ item, onPress }: { item: SportMarket; onPress: () => void }) {
  const eventName =
    typeof item.event?.name === "string" && item.event.name.trim().length > 0
      ? item.event.name
      : `Event ${item.event_id}`;
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 m-2 min-w-[140px] bg-surface-card rounded-xl border border-surface-border p-3 active:opacity-90"
    >
      <Text className="text-slate-400 text-xs" numberOfLines={1}>
        {eventName}
      </Text>
      <Text className="text-slate-100 font-semibold mt-2" numberOfLines={2}>
        Market #{item.id}
      </Text>
      <Text className="text-slate-500 text-xs mt-1">type {item.market_type}</Text>
    </Pressable>
  );
}

export default function BetHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const eventsQ = useBetEventsInfiniteQuery(12);
  const marketsQ = useBetMarketsInfiniteQuery({});

  const eventRows = eventsQ.data?.pages.flatMap((p) => p.items) ?? [];
  const marketRows = marketsQ.data?.pages.flatMap((p) => p.items) ?? [];

  const bannerSlides: BannerSlide[] = eventRows.slice(0, 8).map((ev) => ({
    id: String(ev.id),
    title: ev.name,
    imageUrl: `https://picsum.photos/seed/betev${ev.id}/800/400`,
  }));

  if (!features.commerce) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ paddingTop: insets.top }}>
        <Text className="text-slate-300 text-center">Catalog is off in app config features.commerce.</Text>
      </View>
    );
  }

  const busy = eventsQ.isPending || marketsQ.isPending;
  const err = eventsQ.isError || marketsQ.isError;
  const refetching = eventsQ.isRefetching || marketsQ.isRefetching;

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top + 8 }}>
      <Text className="text-xl font-bold text-slate-100 px-4 mb-2">Markets</Text>
      <FlatList
        data={marketRows}
        keyExtractor={(m) => String(m.id)}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 8 }}
        onEndReached={() => {
          if (marketsQ.hasNextPage && !marketsQ.isFetchingNextPage) {
            void marketsQ.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={
          <>
            <BannerCarousel
              slides={bannerSlides.length > 0 ? bannerSlides : undefined}
              onSlidePress={(s) => router.push(`/(app)/event/${s.id}`)}
            />
            {err ? (
              <Text className="text-red-400 px-4 mb-2">
                {eventsQ.error instanceof Error
                  ? eventsQ.error.message
                  : marketsQ.error instanceof Error
                    ? marketsQ.error.message
                    : "Could not load catalog."}
              </Text>
            ) : null}
          </>
        }
        ListFooterComponent={
          marketsQ.isFetchingNextPage ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="#a5b4fc" />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refetching}
            onRefresh={() => {
              void eventsQ.refetch();
              void marketsQ.refetch();
            }}
            tintColor="#a5b4fc"
          />
        }
        ListEmptyComponent={
          busy ? (
            <View className="py-12 items-center">
              <ActivityIndicator color="#a5b4fc" />
            </View>
          ) : (
            <Text className="text-slate-500 px-4">No open markets.</Text>
          )
        }
        renderItem={({ item }) => (
          <MarketRow item={item} onPress={() => router.push(`/(app)/market/${item.id}`)} />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}
