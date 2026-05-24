import { Text, View } from "react-native";
import type { QuoteDisplayRow } from "@/features/bet/marketQuoteChartSeries";

type MarketCurrentQuoteColumnProps = {
  rows: QuoteDisplayRow[];
};

/** Object–value table for crowd snapshot (“当前行情”); objects decorated with legend colors. */
export function MarketCurrentQuoteColumn({ rows }: MarketCurrentQuoteColumnProps) {
  return (
    <View className="flex-col gap-y-1.5 justify-center">
      {rows.map((row) => (
        <View key={row.outcome_code} className="flex-row items-center gap-1">
          <View className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
          <Text className="text-slate-400 text-[11px] flex-1 min-w-0" numberOfLines={1}>
            {row.label}
          </Text>
          <Text className="text-slate-300 text-[11px] font-medium shrink-0">{row.valueLabel}</Text>
        </View>
      ))}
    </View>
  );
}
