import { Text, View } from "react-native";
import { formatShareBp, type MarketQuoteSnapshot } from "@/lib/api/marketQuote";

const SEGMENT_COLORS = ["#6366f1", "#94a3b8", "#818cf8"] as const;

type MarketQuoteShareBarProps = {
  quote: MarketQuoteSnapshot;
  /** `compact` for list rows; `default` shows pick count under the bar. */
  variant?: "compact" | "default";
  className?: string;
};

/**
 * Horizontal crowd-share bar from `share_bp` on each outcome (10_000 bp = 100%).
 */
export function MarketQuoteShareBar({
  quote,
  variant = "default",
  className = "",
}: MarketQuoteShareBarProps) {
  const segments = quote.outcomes.filter((o) => o.share_bp > 0);
  const hasShare = segments.length > 0;

  return (
    <View className={className}>
      <View className="flex-row h-1.5 rounded-full overflow-hidden bg-surface-border">
        {hasShare ? (
          segments.map((o, idx) => (
            <View
              key={o.outcome_code}
              style={{
                flex: o.share_bp,
                backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
              }}
            />
          ))
        ) : (
          <View className="flex-1 bg-surface-border" />
        )}
      </View>
      {variant === "default" ? (
        <View className="flex-row mt-2 gap-2">
          {quote.outcomes.map((o, idx) => (
            <View key={o.outcome_code} className="flex-1 min-w-0">
              <Text className="text-slate-500 text-[10px] uppercase" numberOfLines={1}>
                {o.outcome_code.replace(/_/g, " ")}
              </Text>
              <Text className="text-slate-300 text-xs font-medium mt-0.5">
                {formatShareBp(o.share_bp)}
              </Text>
              <View
                className="h-0.5 rounded-full mt-1"
                style={{ backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length], width: "100%" }}
              />
            </View>
          ))}
        </View>
      ) : (
        <View className="flex-row mt-1.5 gap-1">
          {quote.outcomes.map((o) => (
            <Text key={o.outcome_code} className="text-slate-500 text-[10px]">
              {formatShareBp(o.share_bp)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
