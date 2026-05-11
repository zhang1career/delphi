import { useRouter } from "expo-router";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWebTopTabBarInset } from "@/lib/navigation/useWebTopTabBarInset";
import type { BannerSlide } from "@/components/app/BannerCarousel";
import { BannerCarousel } from "@/components/app/BannerCarousel";
import { MarketsListView } from "@/features/bet/MarketsListView";
import { useBetEventsInfiniteQuery } from "@/features/bet/hooks";
import { BET_GAMES_GROUP_CODE_FIFA_2026 } from "@/lib/api/betCatalogApi";
import { betGameAssetCdnUri } from "@/lib/betCdn";
import { features } from "@/lib/config";

/** `GET /api/bet/games?per_page=…` for banner carousel; caps slide count. */
const BET_HOME_BANNER_GAMES_PER_PAGE = 5;

export default function BetHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webNavTop = useWebTopTabBarInset();
  const eventsQ = useBetEventsInfiniteQuery(BET_HOME_BANNER_GAMES_PER_PAGE, {
    group_code: BET_GAMES_GROUP_CODE_FIFA_2026,
  });

  const eventRows = eventsQ.data?.pages.flatMap((p) => p.items) ?? [];

  const bannerSlides: BannerSlide[] = eventRows
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
    .slice(0, BET_HOME_BANNER_GAMES_PER_PAGE);

  if (!features.commerce) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ paddingTop: Platform.OS === "web" ? webNavTop : insets.top }}
      >
        <Text className="text-slate-300 text-center">Catalog is off in app config features.commerce.</Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-surface"
      style={{ paddingTop: Platform.OS === "web" ? webNavTop + 8 : insets.top + 8 }}
    >
      <Text className="text-xl font-bold text-slate-100 px-4 mb-2">Events</Text>
      <MarketsListView
        listHeader={
          <>
            <BannerCarousel
              slides={bannerSlides}
              onSlidePress={(s) => {
                const q = new URLSearchParams();
                q.set("game_id", s.id);
                q.set("title", s.title);
                if (s.mainMedia) {
                  q.set("main_media", s.mainMedia);
                }
                router.push(`/(app)/markets?${q.toString()}`);
              }}
            />
            {eventsQ.isError ? (
              <Text className="text-red-400 px-4 mb-2">
                {eventsQ.error instanceof Error ? eventsQ.error.message : "Could not load games."}
              </Text>
            ) : null}
            <Text className="text-xl font-bold text-slate-100 px-4 mb-2">Markets</Text>
          </>
        }
        marketsHeading={null}
        onRefreshExtra={() => void eventsQ.refetch()}
        onMarketPress={(item) => router.push(`/(app)/markets/${item.id}`)}
        contentPaddingTop={0}
        contentPaddingBottom={100}
      />
    </View>
  );
}
