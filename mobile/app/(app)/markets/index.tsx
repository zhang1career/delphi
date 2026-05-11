import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MarketsListView } from "@/features/bet/MarketsListView";
import { betGameAssetCdnUri } from "@/lib/betCdn";
import { features } from "@/lib/config";

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) {
    return undefined;
  }
  return Array.isArray(v) ? v[0] : v;
}

export default function MarketsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    game_id?: string | string[];
    main_media?: string | string[];
    title?: string | string[];
  }>();

  const gameId = firstParam(params.game_id);
  const mainMediaRaw = firstParam(params.main_media);
  const titleParam = firstParam(params.title);

  const backgroundUri = useMemo(() => {
    if (!mainMediaRaw || !mainMediaRaw.trim()) {
      return null;
    }
    try {
      const decoded = decodeURIComponent(mainMediaRaw);
      return betGameAssetCdnUri(decoded);
    } catch {
      return betGameAssetCdnUri(mainMediaRaw);
    }
  }, [mainMediaRaw]);

  useEffect(() => {
    const t = titleParam?.trim();
    if (t) {
      navigation.setOptions({ title: t });
    } else {
      navigation.setOptions({ title: "Predictions" });
    }
  }, [navigation, titleParam]);

  if (!features.commerce) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ paddingTop: insets.top }}>
        <Text className="text-slate-300 text-center">Catalog is off.</Text>
      </View>
    );
  }

  return (
    <MarketsListView
      gameId={gameId}
      backgroundImageUri={backgroundUri}
      contentPaddingBottom={insets.bottom + 24}
      onMarketPress={(item) => router.push(`/(app)/markets/${item.id}`)}
    />
  );
}
