import { useNavigation } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { submitBetOrder, useBetMarketQuery } from "@/features/bet/hooks";
import { MarketQuoteShareBar } from "@/features/bet/MarketQuoteShareBar";
import { MallApiError } from "@/lib/api/mallEnvelope";
import type { SportSelection } from "@/lib/api/betTypes";
import { emptyMarketQuoteSnapshot, formatShareBp, quoteOutcomeByCode } from "@/lib/api/marketQuote";
import { formatKickoffMs } from "@/lib/formatKickoff";
import { isThreeWayLineup, MatchResultThreeWayRow } from "@/features/bet/MatchResultThreeWay";
import { features } from "@/lib/config";
import { buildLoginHref } from "@/lib/auth/postLoginReturn";
import { useLocale } from "@/i18n/LocaleProvider";
import { MallUnauthorizedRedirectError } from "@/lib/auth/mallSessionUnauthorized";
import { useToast } from "@/lib/notifications/toast";
import { useAuthStore } from "@/stores/authStore";

export default function MarketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const accessToken = useAuthStore((s) => s.accessToken);

  const marketId = typeof id === "string" ? id : "";
  const marketQ = useBetMarketQuery(marketId);

  const [selectedKid, setSelectedKid] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const market = marketQ.data;
  const lines = market?.selections ?? [];
  const quote = market?.quote ?? emptyMarketQuoteSnapshot();

  const onCatalogRefresh = () => {
    setRefreshing(true);
    void marketQ.refetch().finally(() => setRefreshing(false));
  };

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
      const selected = lines.find((x) => x.id === kid);
      if (!selected || !market) {
        throw new Error("Choose an outcome.");
      }
      return submitBetOrder([{ market_id: market.id, outcome_code: selected.outcome_code }]);
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["bet-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["bet-reputation"] });
      void queryClient.invalidateQueries({ queryKey: ["bet-leaderboard"] });
      toast.show("Prediction submitted", { level: "info" });
      setTimeout(() => {
        router.replace("/(app)/(tabs)");
      }, 0);
    },
    onError(e: unknown) {
      if (e instanceof MallUnauthorizedRedirectError) {
        return;
      }
      if (e instanceof MallApiError) {
        toast.show(e.message.trim() || `Request failed (${e.errorCode})`, { variant: "error" });
        return;
      }
      toast.show(e instanceof Error ? e.message : "Could not submit prediction.", { variant: "error" });
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
        <Text className="text-slate-300 text-center">{t("markets.catalogOff")}</Text>
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
          {marketQ.error instanceof Error ? marketQ.error.message : t("markets.loadMarketError")}
        </Text>
      </View>
    );
  }

  const gameLabel =
    typeof market.game?.name === "string" && market.game.name.trim()
      ? market.game.name
      : `Game ${market.game_id}`;

  const bottomPad = insets.bottom + 100;

  const contentShellClass =
    Platform.OS === "web" ? "w-full max-w-2xl self-center px-2" : "w-full";
  const footerBarClass = Platform.OS === "web" ? "w-full max-w-2xl self-center px-4" : "px-4";
  const showThreeWay = isThreeWayLineup(lines);

  const submitBlocked = lines.length === 0 || mutate.isPending;

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        refreshControl={
          Platform.OS === "web" ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onCatalogRefresh} />
          )
        }
      >
        <View className={contentShellClass}>
          <View className="p-4">
            <Text className="text-slate-400 text-sm">{gameLabel}</Text>
            <Text className="text-slate-300 text-xs mt-1">
              {market.name.trim().length > 0 ? market.name : `Market #${market.id}`}
            </Text>
            <Text className="text-slate-500 text-xs mt-2">
              Pick one outcome. This is a non-monetary prediction; reputation may change after settlement.
            </Text>
            <View className="mt-4 rounded-xl border border-surface-border bg-surface p-3">
              <Text className="text-slate-400 text-xs uppercase tracking-wide">{t("markets.crowdSentiment")}</Text>
              <Text className="text-slate-300 text-sm mt-1">
                {t("markets.totalPicks")}: {quote.total_picks}
              </Text>
              {quote.as_of !== null && quote.as_of > 0 ? (
                <Text className="text-slate-500 text-xs mt-1">
                  {t("markets.quoteAsOf")}: {formatKickoffMs(quote.as_of)}
                </Text>
              ) : null}
              <MarketQuoteShareBar quote={quote} className="mt-3" />
            </View>
          </View>
          {showThreeWay ? (
            <MatchResultThreeWayRow
              lines={lines}
              eventName={gameLabel}
              selectedKid={selectedKid}
              onSelect={setSelectedKid}
              quote={quote}
            />
          ) : (
            lines.map((line) => {
              const shareBp = quoteOutcomeByCode(quote, line.outcome_code)?.share_bp;
              return (
                <SelectionRow
                  key={line.id}
                  line={line}
                  chosen={selectedKid === line.id}
                  onSelect={() => setSelectedKid(line.id)}
                  shareLabel={shareBp !== undefined ? formatShareBp(shareBp) : undefined}
                />
              );
            })
          )}
          {lines.length === 0 ? (
            <Text className="text-slate-500 px-4">{t("markets.noOpenSelections")}</Text>
          ) : null}
        </View>
      </ScrollView>

      <View
        className="absolute left-0 right-0 border-t border-surface-border bg-surface"
        style={{ bottom: 0, paddingBottom: insets.bottom }}
      >
        <View className={footerBarClass}>
          <Pressable
            accessibilityLabel={t("markets.submitPrediction")}
            disabled={submitBlocked}
            onPress={() => {
              if (!accessToken?.trim()) {
                router.push(buildLoginHref(`/(app)/markets/${marketId}`));
                return;
              }
              mutate.mutate();
            }}
            className={`my-3 py-3.5 rounded-xl items-center justify-center ${
              submitBlocked ? "bg-slate-600 opacity-70" : "bg-brand active:opacity-90"
            }`}
          >
            {mutate.isPending ? (
              <ActivityIndicator color="#f8fafc" />
            ) : (
              <Text className="text-white font-semibold text-base">{t("markets.submitPrediction")}</Text>
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
  shareLabel,
}: {
  line: SportSelection;
  chosen: boolean;
  onSelect: () => void;
  shareLabel?: string;
}) {
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen }}
      accessibilityLabel={line.label}
      className={`mx-4 mb-2 rounded-xl border p-4 ${
        chosen ? "border-brand bg-surface-card" : "border-surface-border bg-surface"
      } active:opacity-90`}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-slate-100 font-medium flex-1">{line.label}</Text>
        {shareLabel ? <Text className="text-indigo-300 text-sm font-medium">{shareLabel}</Text> : null}
      </View>
    </Pressable>
  );
}
