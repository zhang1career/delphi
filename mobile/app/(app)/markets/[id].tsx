import { useNavigation } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { placeBetOrder, useBetMarketQuery } from "@/features/bet/hooks";
import { MallApiError } from "@/lib/api/mallEnvelope";
import type { SportSelection } from "@/lib/api/betTypes";
import { formatDecimalOddsFromMillis } from "@/lib/api/betTypes";
import { isThreeWayLineup, MatchResultThreeWayRow } from "@/features/bet/MatchResultThreeWay";
import { features } from "@/lib/config";
import { useToast } from "@/lib/notifications/toast";

export default function MarketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const marketId = typeof id === "string" ? id : "";
  const marketQ = useBetMarketQuery(marketId);

  const [selectedKid, setSelectedKid] = useState<number | null>(null);
  const [stakeRaw, setStakeRaw] = useState("100");

  const market = marketQ.data;
  const lines = market?.selections ?? [];

  useEffect(() => {
    const title =
      market && typeof market.name === "string" && market.name.trim().length > 0
        ? market.name.trim()
        : market
          ? `Market #${market.id}`
          : "Market";
    navigation.setOptions({ title });
  }, [market, navigation]);

  const mutate = useMutation({
    mutationFn: async () => {
      const kid = selectedKid ?? lines[0]?.id;
      if (kid === null || kid === undefined || kid < 1) {
        throw new Error("Choose an outcome.");
      }
      const stakePoints = Number.parseInt(stakeRaw.trim(), 10);
      if (!Number.isFinite(stakePoints) || stakePoints < 1) {
        throw new Error("Enter stake (points, ≥ 1).");
      }
      const placed = await placeBetOrder([{ kid, stake_points: stakePoints }]);
      return placed.id;
    },
    onSuccess(orderId: number) {
      void queryClient.invalidateQueries({ queryKey: ["bet-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["bet-points"] });
      toast.show("Order placed");
      router.replace(`/(app)/order/${orderId}`);
    },
    onError(e: unknown) {
      if (e instanceof MallApiError) {
        toast.show(e.message.trim() || `Request failed (${e.errorCode})`, { variant: "error" });
        return;
      }
      toast.show(e instanceof Error ? e.message : "Could not complete order.", { variant: "error" });
    },
  });

  const lineKey = lines.map((x) => x.id).join(",");
  useEffect(() => {
    const firstId = lines[0]?.id;
    if (firstId !== undefined && (selectedKid === null || !lines.some((x) => x.id === selectedKid))) {
      setSelectedKid(firstId);
    }
  }, [lineKey, lines, selectedKid]);

  if (!features.commerce) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-slate-300 text-center">Catalog is off.</Text>
      </View>
    );
  }

  if (marketQ.isPending) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator color="#a5b4fc" />
      </View>
    );
  }

  if (marketQ.isError || !market) {
    return (
      <View className="flex-1 bg-surface px-6 justify-center">
        <Text className="text-red-400 text-center">
          {marketQ.error instanceof Error ? marketQ.error.message : "Could not load market."}
        </Text>
      </View>
    );
  }

  const gameLabel =
    typeof market.game?.name === "string" && market.game.name.trim()
      ? market.game.name
      : `Game ${market.game_id}`;

  const bottomPad = insets.bottom + 120;

  const contentShellClass =
    Platform.OS === "web" ? "w-full max-w-2xl self-center px-2" : "w-full";
  const footerBarClass = Platform.OS === "web" ? "w-full max-w-2xl self-center px-4" : "px-4";
  const showThreeWay = isThreeWayLineup(lines);

  return (
    <View className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad }}>
        <View className={contentShellClass}>
          <View className="p-4">
            <Text className="text-slate-400 text-sm">{gameLabel}</Text>
            <Text className="text-slate-300 text-xs mt-1">
              {market.name.trim().length > 0 ? market.name : `Market #${market.id}`}
            </Text>
          </View>
          {showThreeWay ? (
            <MatchResultThreeWayRow
              lines={lines}
              eventName={gameLabel}
              selectedKid={selectedKid}
              onSelect={setSelectedKid}
            />
          ) : (
            lines.map((line) => (
              <SelectionRow
                key={line.id}
                line={line}
                chosen={selectedKid === line.id}
                onSelect={() => setSelectedKid(line.id)}
              />
            ))
          )}
          {lines.length === 0 ? (
            <Text className="text-slate-500 px-4">No open selections for this market.</Text>
          ) : null}

          <View className="px-4 mt-6 gap-2">
            <Text className="text-slate-400 text-xs">Stake (points)</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-3 py-2.5 text-slate-100"
              keyboardType="number-pad"
              placeholder="100"
              placeholderTextColor="#64748b"
              value={stakeRaw}
              onChangeText={setStakeRaw}
            />
            <Text className="text-slate-500 text-xs mt-2">
              Checkout debits this full stake from your points wallet (server-side).
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute left-0 right-0 border-t border-surface-border bg-surface"
        style={{ bottom: 0, paddingBottom: insets.bottom }}
      >
        <View className={footerBarClass}>
          <Pressable
            accessibilityLabel="Place bet draft and checkout"
            disabled={lines.length === 0 || mutate.isPending}
            onPress={() => mutate.mutate()}
            className={`my-3 py-3.5 rounded-xl items-center justify-center ${
              lines.length === 0 || mutate.isPending ? "bg-slate-600 opacity-70" : "bg-brand active:opacity-90"
            }`}
          >
            {mutate.isPending ? (
              <ActivityIndicator color="#f8fafc" />
            ) : (
              <Text className="text-white font-semibold text-base">Place order (checkout)</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SelectionRow({
  line,
  chosen,
  onSelect,
}: {
  line: SportSelection;
  chosen: boolean;
  onSelect: () => void;
}) {
  const odds = useMemo(() => formatDecimalOddsFromMillis(line.current_odds_millis), [line.current_odds_millis]);
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen }}
      className={`mx-4 mb-2 rounded-xl border p-4 ${
        chosen ? "border-brand bg-surface-card" : "border-surface-border bg-surface"
      } active:opacity-90`}
    >
      <Text className="text-slate-100 font-medium">{line.label}</Text>
      <Text className="text-brand-muted text-lg mt-1">{odds}</Text>
    </Pressable>
  );
}
