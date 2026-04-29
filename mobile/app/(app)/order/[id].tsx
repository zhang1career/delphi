import { useOrderQuery } from "@/features/orders/hooks";
import { betOrderStatusLabel } from "@/lib/api/betTypes";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PrepayStub } from "@/lib/api/checkoutTypes";

const SCROLL_BOTTOM_EXTRA = 24;

function formatMinor(n: number): string {
  return `${(n / 100).toFixed(2)}`;
}

function formatTime(sec: number): string {
  try {
    return new Date(sec * 1000).toLocaleString();
  } catch {
    return String(sec);
  }
}

function parsePrepayStubParam(raw: string | undefined): PrepayStub | null {
  if (raw == null || raw === "") {
    return null;
  }
  try {
    const decoded = decodeURIComponent(raw);
    const o = JSON.parse(decoded) as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) {
      return null;
    }
    const r = o as Record<string, unknown>;
    const order_id =
      typeof r.order_id === "number" && Number.isFinite(r.order_id)
        ? Math.trunc(r.order_id)
        : Number.parseInt(String(r.order_id ?? ""), 10) || 0;
    const amount_minor =
      typeof r.amount_minor === "number" && Number.isFinite(r.amount_minor)
        ? Math.trunc(r.amount_minor)
        : Number.parseInt(String(r.amount_minor ?? ""), 10) || 0;
    const uid =
      typeof r.uid === "number" && Number.isFinite(r.uid)
        ? Math.trunc(r.uid)
        : Number.parseInt(String(r.uid ?? ""), 10) || 0;
    const statusRaw = r.status;
    const status =
      typeof statusRaw === "string" ? statusRaw : statusRaw == null ? "" : String(statusRaw);
    return { order_id, amount_minor, uid, status };
  } catch {
    return null;
  }
}

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ id: string; prepayJson?: string }>();
  const { id } = params;
  const prepayJsonRaw = params.prepayJson;
  const prepayJson = Array.isArray(prepayJsonRaw) ? prepayJsonRaw[0] : prepayJsonRaw;
  const prepayStub = parsePrepayStubParam(prepayJson);

  const insets = useSafeAreaInsets();
  const { data: order, isPending, isError, error, isSuccess } = useOrderQuery(id ?? "");
  const bottomPad = insets.bottom + SCROLL_BOTTOM_EXTRA;

  if (isPending) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#a5b4fc" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-surface items-center justify-center px-6">
        <Text className="text-red-400 text-center">
          {error instanceof Error ? error.message : "Could not load order."}
        </Text>
      </View>
    );
  }

  if (isSuccess && order === null) {
    return (
      <View className="flex-1 bg-surface items-center justify-center px-6">
        <Text className="text-slate-400 text-center">Order not found.</Text>
      </View>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: bottomPad,
      }}
    >
      {order.lines.map((line, idx) => (
        <View
          key={`${line.kid}-${idx}`}
          className="bg-surface-card border border-surface-border rounded-lg p-3 mb-2"
        >
          <Text className="text-slate-200 text-sm">Selection kid {line.kid}</Text>
          <Text className="text-slate-400 text-xs mt-1">Stake (points) {line.stake_points}</Text>
          {line.decimal_odds_millis !== undefined ? (
            <Text className="text-brand-muted text-sm mt-1">
              Odds {(line.decimal_odds_millis / 1000).toFixed(2)}
            </Text>
          ) : null}
          {line.potential_return_points !== undefined ? (
            <Text className="text-slate-500 text-xs mt-1">
              Potential return (points minor) {line.potential_return_points}
            </Text>
          ) : null}
          {line.result !== undefined ? (
            <Text className="text-slate-600 text-[10px] mt-2">Line result enum {line.result}</Text>
          ) : null}
        </View>
      ))}

      <Text className="text-slate-400 mt-6 capitalize">
        Status: {betOrderStatusLabel(order.status)}
      </Text>
      <Text className="text-brand-muted text-lg mt-2">{formatMinor(order.total_price)} total (minor)</Text>
      <Text className="text-slate-500 text-xs mt-2">
        Points deducted (minor): {order.points_deduct_minor} · Cash payable (minor):{" "}
        {order.cash_payable_minor}
      </Text>
      <Text className="text-slate-500 text-sm mt-4">Created: {formatTime(order.ct)}</Text>
      <Text className="text-slate-500 text-sm">Updated: {formatTime(order.ut)}</Text>

      {order.checkout_phase ? (
        <Text className="text-slate-500 text-xs mt-4">Checkout phase: {order.checkout_phase}</Text>
      ) : null}

      {prepayStub ? (
        <View className="mt-6 pt-4 border-t border-surface-border gap-1">
          <Text className="text-slate-400 text-sm font-semibold">Payment prepay (stub)</Text>
          <Text className="text-slate-500 text-xs">status: {prepayStub.status || "—"}</Text>
          <Text className="text-slate-500 text-xs">amount_minor: {prepayStub.amount_minor}</Text>
          <Text className="text-slate-500 text-xs">order_id: {prepayStub.order_id}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
