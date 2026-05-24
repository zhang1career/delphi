import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BannerSlide } from "@/components/app/BannerCarousel";
import { BannerCarousel } from "@/components/app/BannerCarousel";
import { MarketsListView } from "@/features/bet/MarketsListView";
import { useBannerGroupCodeQuery, useBetEventsInfiniteQuery } from "@/features/bet/hooks";
import { betGameAssetCdnUri } from "@/lib/betCdn";
import type { SportMarket } from "@/lib/api/betTypes";
import { features } from "@/lib/config";
import { useLocale } from "@/i18n/LocaleProvider";
import { useWebTopTabBarInset } from "@/lib/navigation/useWebTopTabBarInset";

/** `GET /api/bet/games?per_page=…` for banner carousel; caps slide count. */
const BET_HOME_BANNER_GAMES_PER_PAGE = 5;

export default function BetHomeScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const webNavTop = useWebTopTabBarInset();
  const bannerGroupQ = useBannerGroupCodeQuery();
  const eventsQ = useBetEventsInfiniteQuery(BET_HOME_BANNER_GAMES_PER_PAGE, {
    group_code: bannerGroupQ.data,
    enabled: !!bannerGroupQ.data,
  });
  const { data: eventsData, error: eventsError, isError: eventsIsError, refetch: refetchEvents } =
    eventsQ;

  const eventRows = eventsData?.pages.flatMap((p) => p.items) ?? [];

  const bannerSlides: BannerSlide[] = useMemo(
    () =>
      eventRows
        .map((ev) => {
          const imageUrl =
            ev.bannerCdnUrl ??
            betGameAssetCdnUri(ev.banner) ??
            betGameAssetCdnUri(ev.main_media);
          if (!imageUrl) {
            return null;
          }
          return {
            id: String(ev.id),
            title: ev.name,
            imageUrl,
            ...(typeof ev.main_media === "string" && ev.main_media.trim().length > 0
              ? { mainMedia: ev.main_media.trim() }
              : {}),
          };
        })
        .filter((s): s is BannerSlide => s !== null)
        .slice(0, BET_HOME_BANNER_GAMES_PER_PAGE),
    [eventRows],
  );

  const handleSlidePress = useCallback(
    (s: BannerSlide) => {
      const q = new URLSearchParams();
      q.set("game_id", s.id);
      q.set("title", s.title);
      if (s.mainMedia) {
        q.set("main_media", s.mainMedia);
      }
      router.push(`/(app)/markets?${q.toString()}`);
    },
    [router],
  );

  const handleMarketPress = useCallback(
    (item: SportMarket) => {
      router.push(`/(app)/markets/${item.id}`);
    },
    [router],
  );

  const handleRefreshExtra = useCallback(() => {
    void refetchEvents();
  }, [refetchEvents]);

  const listHeader = useMemo(
    () => (
      <>
        <BannerCarousel slides={bannerSlides} onSlidePress={handleSlidePress} />
        {bannerGroupQ.isError ? (
          <Text className="text-red-400 px-4 mb-2">
            {bannerGroupQ.error instanceof Error
              ? bannerGroupQ.error.message
              : t("home.loadBannerConfigError")}
          </Text>
        ) : null}
        {eventsIsError ? (
          <Text className="text-red-400 px-4 mb-2">
            {eventsError instanceof Error ? eventsError.message : t("home.loadGamesError")}
          </Text>
        ) : null}
        <Text className="text-xl font-bold text-slate-100 px-4 mb-2">{t("home.markets")}</Text>
      </>
    ),
    [
      bannerGroupQ.error,
      bannerGroupQ.isError,
      bannerSlides,
      eventsError,
      eventsIsError,
      handleSlidePress,
      t,
    ],
  );

  if (!features.commerce) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ paddingTop: Platform.OS === "web" ? webNavTop : insets.top }}
      >
        <Text className="text-slate-300 text-center">{t("home.catalogOff")}</Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-surface"
      style={{ paddingTop: Platform.OS === "web" ? webNavTop + 8 : insets.top + 8 }}
    >
      <Text className="text-xl font-bold text-slate-100 px-4 mb-2">{t("home.events")}</Text>
      <MarketsListView
        listHeader={listHeader}
        marketsHeading={null}
        onRefreshExtra={handleRefreshExtra}
        onMarketPress={handleMarketPress}
        contentPaddingTop={0}
        contentPaddingBottom={100}
      />
    </View>
  );
}
