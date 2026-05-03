import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MarketsListView } from "@/features/bet/MarketsListView";
import { useBetEventQuery } from "@/features/bet/hooks";
import { features } from "@/lib/config";

function fmtMs(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const eventQ = useBetEventQuery(id ?? "");

  const ev = eventQ.data;

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

  const listHeader =
    eventQ.isPending ? (
      <View className="py-12 items-center">
        <ActivityIndicator color="#a5b4fc" />
      </View>
    ) : eventQ.error ? (
      <Text className="text-red-400 px-4 mb-2">
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
      <Text className="text-slate-500 px-4 mb-2">Event not found.</Text>
    );

  return (
    <MarketsListView
      gameId={id ?? ""}
      backgroundImageUri={ev?.bannerCdnUrl ?? null}
      listHeader={listHeader}
      contentPaddingBottom={insets.bottom + 24}
      onRefreshExtra={() => void eventQ.refetch()}
      onMarketPress={(item) => router.push(`/(app)/market/${item.id}`)}
    />
  );
}
