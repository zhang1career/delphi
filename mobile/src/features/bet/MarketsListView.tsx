import type { ReactElement } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useBetMarketsInfiniteQuery } from "@/features/bet/hooks";
import type { SportMarket } from "@/lib/api/betTypes";

function MarketRow({ item, onPress }: { item: SportMarket; onPress: () => void }) {
  const gameTitle = item.game?.name?.trim() ?? "";
  const marketName = item.name.trim().length > 0 ? item.name.trim() : "—";
  const statusLabel = item.market_status_label?.trim() ?? "—";
  const titleDisplay = gameTitle.length > 0 ? gameTitle : "—";

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-3 bg-surface-card rounded-xl border border-surface-border p-4 active:opacity-90"
    >
      <View className="flex-row items-center">
        <Text className="flex-1 text-sm min-w-0 mr-2" numberOfLines={3}>
          <Text className="text-slate-300">{titleDisplay}</Text>
          <Text className="text-slate-300">{"  "}</Text>
          <Text className="text-slate-100 font-semibold">{marketName}</Text>
        </Text>
        <Text className="text-slate-500 text-xs shrink-0">{statusLabel}</Text>
      </View>
    </Pressable>
  );
}

export type MarketsListViewProps = {
  /** When set and a positive integer, filters `GET /api/bet/markets?game_id=…`. */
  gameId?: string;
  /** Resolved image URL (e.g. via `mallCdnBaseUrl` + `main_media` key). Shown behind the list. */
  backgroundImageUri?: string | null;
  /** Shown above the “Markets” heading inside the list header. */
  listHeader?: ReactElement | null;
  /** Shown directly under `listHeader` before the markets heading. Default: “Markets”. */
  marketsHeading?: string | null;
  onMarketPress: (item: SportMarket) => void;
  contentPaddingTop?: number;
  contentPaddingBottom?: number;
  onRefreshExtra?: () => void | Promise<void>;
};

/**
 * Infinite-scrolling markets list: all markets, or filtered by `game_id`, with optional CDN background image.
 */
export function MarketsListView({
  gameId,
  backgroundImageUri,
  listHeader = null,
  marketsHeading = "Markets",
  onMarketPress,
  contentPaddingTop = 12,
  contentPaddingBottom = 24,
  onRefreshExtra,
}: MarketsListViewProps) {
  const marketsQ = useBetMarketsInfiniteQuery({ gameId });
  const rows = marketsQ.data?.pages.flatMap((p) => p.items) ?? [];
  const marketsErr: string | null = marketsQ.isError
    ? marketsQ.error instanceof Error
      ? marketsQ.error.message
      : "Could not load markets."
    : null;

  const listBody = (
    <FlatList
      style={{ flex: 1 }}
      data={rows}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={{ paddingBottom: contentPaddingBottom, paddingTop: contentPaddingTop }}
      refreshControl={
        <RefreshControl
          refreshing={marketsQ.isRefetching}
          onRefresh={() => {
            void marketsQ.refetch();
            void onRefreshExtra?.();
          }}
          tintColor="#a5b4fc"
        />
      }
      ListHeaderComponent={
        <>
          {listHeader}
          {marketsErr ? (
            <Text className="text-red-400 px-4 mb-2">{marketsErr}</Text>
          ) : null}
          {marketsHeading !== null ? (
            <Text className="text-slate-200 font-semibold px-4 mb-2">{marketsHeading}</Text>
          ) : null}
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
          <Text className="text-slate-500 px-4">
            No markets{gameId?.trim() ? " for this game" : ""}.
          </Text>
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
        <MarketRow item={item} onPress={() => onMarketPress(item)} />
      )}
    />
  );

  if (backgroundImageUri) {
    return (
      <ImageBackground
        source={{ uri: backgroundImageUri }}
        className="flex-1"
        resizeMode="cover"
      >
        <View className="flex-1" style={{ backgroundColor: "rgba(15, 23, 42, 0.88)" }}>
          {listBody}
        </View>
      </ImageBackground>
    );
  }

  return <View className="flex-1 bg-surface">{listBody}</View>;
}
