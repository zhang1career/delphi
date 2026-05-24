import { memo, useCallback, useMemo, useRef, type ReactElement } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  Text,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  MARKET_QUOTE_REFRESH_MS,
  useBetMarketQuotesQuery,
  useBetMarketsInfiniteQuery,
} from "@/features/bet/hooks";
import { MarketQuoteHistoryChart } from "@/features/bet/MarketQuoteHistoryChart";
import type { SportMarket } from "@/lib/api/betTypes";
import { emptyMarketQuoteSnapshot, type MarketQuoteSnapshot } from "@/lib/api/marketQuote";
import { formatKickoffMs } from "@/lib/formatKickoff";
import { useLocale } from "@/i18n/LocaleProvider";

function marketRowTitle(item: SportMarket): string {
  const gameTitle = item.game?.name?.trim() ?? "";
  const marketName = item.name.trim();
  if (gameTitle.length > 0 && marketName.length > 0) {
    return `${gameTitle} · ${marketName}`;
  }
  if (gameTitle.length > 0) {
    return gameTitle;
  }
  if (marketName.length > 0) {
    return marketName;
  }
  return `Market #${item.id}`;
}

const TEAM_ICON_SIZE = 32;

function TeamIconPlaceholder() {
  return (
    <View
      className="rounded-full bg-slate-700 border border-slate-600"
      style={{ width: TEAM_ICON_SIZE, height: TEAM_ICON_SIZE }}
    />
  );
}

function TeamSideIcon({ uri }: { uri: string | null }) {
  if (uri === null) {
    return <TeamIconPlaceholder />;
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: TEAM_ICON_SIZE, height: TEAM_ICON_SIZE, borderRadius: TEAM_ICON_SIZE / 2 }}
      resizeMode="cover"
    />
  );
}

function MarketTeamIcons({
  sideAUrl,
  sideBUrl,
}: {
  sideAUrl: string | null;
  sideBUrl: string | null;
}) {
  return (
    <View className="flex-row items-center shrink-0">
      <TeamSideIcon uri={sideAUrl} />
      <Text className="text-slate-500 text-[10px] font-semibold uppercase mx-1.5">vs</Text>
      <TeamSideIcon uri={sideBUrl} />
    </View>
  );
}

const MarketRow = memo(function MarketRow({
  item,
  quote,
  onPress,
}: {
  item: SportMarket;
  quote: MarketQuoteSnapshot;
  onPress: (item: SportMarket) => void;
}) {
  const { t } = useLocale();
  const title = marketRowTitle(item);
  const gameTitle = item.game?.name?.trim() ?? "";
  const startsAt = item.game?.starts_at ?? 0;
  const startsAtLabel = startsAt > 0 ? formatKickoffMs(startsAt) : t("common.emDash");

  return (
    <Pressable
      onPress={() => onPress(item)}
      className="mx-4 mb-3 bg-surface-card rounded-xl border border-surface-border p-4 active:opacity-90"
    >
      <View className="flex-row items-start gap-3">
        <MarketTeamIcons
          sideAUrl={item.game?.side_a_icon_url ?? null}
          sideBUrl={item.game?.side_b_icon_url ?? null}
        />
        <Text className="flex-1 text-slate-100 font-semibold text-base leading-snug" numberOfLines={3}>
          {title}
        </Text>
      </View>

      <MarketQuoteHistoryChart
        marketId={item.id}
        marketType={item.type}
        quote={quote}
        eventName={gameTitle}
        className="mt-3"
      />

      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-slate-500 text-xs">{startsAtLabel}</Text>
        <Text className="text-slate-500 text-xs">
          {t("markets.totalPicks")}: {quote.total_picks}
        </Text>
      </View>
    </Pressable>
  );
});

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
  marketsHeading = "Predictions",
  onMarketPress,
  contentPaddingTop = 12,
  contentPaddingBottom = 24,
  onRefreshExtra,
}: MarketsListViewProps) {
  const queryClient = useQueryClient();
  const marketsQ = useBetMarketsInfiniteQuery({ gameId });
  const {
    data: marketsData,
    error: marketsError,
    fetchNextPage,
    hasNextPage,
    isError: marketsIsError,
    isFetchingNextPage,
    isPending: marketsIsPending,
    isRefetching: marketsIsRefetching,
    refetch: refetchMarkets,
  } = marketsQ;
  const rows = marketsData?.pages.flatMap((p) => p.items) ?? [];
  const marketIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const quotesQ = useBetMarketQuotesQuery(marketIds, {
    refetchInterval: MARKET_QUOTE_REFRESH_MS,
  });
  const quoteByMarketId = useMemo(() => {
    const map = new Map<number, MarketQuoteSnapshot>();
    for (const item of rows) {
      map.set(item.id, item.quote ?? emptyMarketQuoteSnapshot());
    }
    for (const batch of quotesQ.data ?? []) {
      map.set(batch.market_id, batch.quote);
    }
    return map;
  }, [rows, quotesQ.data]);

  const marketsErr: string | null = marketsIsError
    ? marketsError instanceof Error
      ? marketsError.message
      : "Could not load markets."
    : null;

  const endReachedLock = useRef(false);

  const keyExtractor = useCallback((m: SportMarket) => String(m.id), []);

  const contentContainerStyle = useMemo(
    () => ({ paddingBottom: contentPaddingBottom, paddingTop: contentPaddingTop }),
    [contentPaddingBottom, contentPaddingTop],
  );

  const listHeaderComponent = useMemo(
    () => (
      <>
        {listHeader}
        {marketsErr ? (
          <Text className="text-red-400 px-4 mb-2">{marketsErr}</Text>
        ) : null}
        {marketsHeading !== null ? (
          <Text className="text-slate-200 font-semibold px-4 mb-2">{marketsHeading}</Text>
        ) : null}
      </>
    ),
    [listHeader, marketsErr, marketsHeading],
  );

  const handleRefresh = useCallback(() => {
    void refetchMarkets();
    void queryClient.invalidateQueries({ queryKey: ["bet-market-quotes"] });
    void queryClient.invalidateQueries({ queryKey: ["bet-market-quote-history"] });
    void onRefreshExtra?.();
  }, [onRefreshExtra, queryClient, refetchMarkets]);

  const handleEndReached = useCallback(() => {
    if (endReachedLock.current || !hasNextPage || isFetchingNextPage) {
      return;
    }
    endReachedLock.current = true;
    void fetchNextPage().finally(() => {
      endReachedLock.current = false;
    });
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<SportMarket>) => (
      <MarketRow
        item={item}
        quote={quoteByMarketId.get(item.id) ?? emptyMarketQuoteSnapshot()}
        onPress={onMarketPress}
      />
    ),
    [onMarketPress, quoteByMarketId],
  );

  const listEmptyComponent = useMemo(
    () =>
      !marketsIsPending ? (
        <Text className="text-slate-500 px-4">
          No markets{gameId?.trim() ? " for this game" : ""}.
        </Text>
      ) : (
        <View className="py-8 items-center">
          <ActivityIndicator color="#a5b4fc" />
        </View>
      ),
    [gameId, marketsIsPending],
  );

  const listFooterComponent = useMemo(
    () =>
      isFetchingNextPage ? (
        <View className="py-4 items-center">
          <ActivityIndicator color="#a5b4fc" />
        </View>
      ) : null,
    [isFetchingNextPage],
  );

  const listBody = (
    <FlatList
      style={{ flex: 1 }}
      data={rows}
      keyExtractor={keyExtractor}
      contentContainerStyle={contentContainerStyle}
      refreshControl={
        <RefreshControl
          refreshing={marketsIsRefetching}
          onRefresh={handleRefresh}
          tintColor="#a5b4fc"
        />
      }
      ListHeaderComponent={listHeaderComponent}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={listEmptyComponent}
      ListFooterComponent={listFooterComponent}
      renderItem={renderItem}
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
