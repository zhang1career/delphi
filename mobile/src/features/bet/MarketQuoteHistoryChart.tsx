import { useMemo, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, Text, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { useBetMarketQuoteHistoryQuery } from "@/features/bet/hooks";
import {
  buildQuoteHistorySeries,
  formatChartAxisDate,
  plotPointsToPath,
  quoteHistoryTimeDomain,
  seriesToPlotPoints,
  type QuoteChartSeries,
} from "@/features/bet/marketQuoteChartSeries";

const CHART_HEIGHT = 80;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function fallbackTimeDomain(): { min: number; max: number } {
  const max = Date.now();
  return { min: max - SEVEN_DAYS_MS, max };
}
const Y_AXIS_WIDTH = 36;
const Y_TICKS = [100, 50, 0] as const;

type MarketQuoteHistoryChartProps = {
  marketId: number;
  /** Game title for legend labels (e.g. parse "Home vs Away"). */
  eventName?: string;
  className?: string;
};

function LegendRow({ series }: { series: QuoteChartSeries[] }) {
  return (
    <View className="flex-row flex-wrap gap-x-3 gap-y-1 mb-2">
      {series.map((s) => (
        <View key={s.outcome_code} className="flex-row items-center gap-1.5 max-w-[46%]">
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
          <Text className="text-slate-400 text-[11px]" numberOfLines={1}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ChartPlot({
  series,
  plotWidth,
  domain,
}: {
  series: QuoteChartSeries[];
  plotWidth: number;
  domain: { min: number; max: number };
}) {
  const plotHeight = CHART_HEIGHT;
  const gridYs = Y_TICKS.map((tick) => plotHeight - (tick / 100) * plotHeight);

  return (
    <Svg width={plotWidth} height={plotHeight}>
      {gridYs.map((y, idx) => (
        <Line
          key={Y_TICKS[idx]}
          x1={0}
          y1={y}
          x2={plotWidth}
          y2={y}
          stroke="#334155"
          strokeWidth={1}
          strokeDasharray={tickIsEdge(idx) ? undefined : "4 4"}
        />
      ))}
      {series.map((s) => {
        const plotPoints = seriesToPlotPoints(s.points, plotWidth, plotHeight, domain);
        const d = plotPointsToPath(plotPoints);
        if (d.length === 0) {
          return null;
        }
        return (
          <Path
            key={s.outcome_code}
            d={d}
            stroke={s.color}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

function tickIsEdge(idx: number): boolean {
  return idx === 0 || idx === Y_TICKS.length - 1;
}

export function MarketQuoteHistoryChart({
  marketId,
  eventName,
  className = "",
}: MarketQuoteHistoryChartProps) {
  const historyQ = useBetMarketQuoteHistoryQuery(String(marketId), {
    interval: "1h",
    staleTime: 5 * 60 * 1000,
  });
  const [plotWidth, setPlotWidth] = useState(0);

  const series = useMemo(
    () => buildQuoteHistorySeries(historyQ.data?.items ?? [], { eventName }),
    [historyQ.data?.items, eventName],
  );
  const domain = useMemo(() => quoteHistoryTimeDomain(series) ?? fallbackTimeDomain(), [series]);

  const onPlotLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== plotWidth) {
      setPlotWidth(w);
    }
  };

  const hasHistory = quoteHistoryTimeDomain(series) !== null;
  const xMinLabel = formatChartAxisDate(domain.min);
  const xMaxLabel = formatChartAxisDate(domain.max);

  return (
    <View className={className}>
      <LegendRow series={series} />
      <View className="flex-row items-stretch">
        <View style={{ width: Y_AXIS_WIDTH }} className="justify-between pr-1">
          {Y_TICKS.map((tick) => (
            <Text key={tick} className="text-slate-500 text-[10px] text-right leading-none">
              {tick}%
            </Text>
          ))}
        </View>
        <View className="flex-1 min-w-0">
          {historyQ.isPending ? (
            <View style={{ height: CHART_HEIGHT }} className="items-center justify-center">
              <ActivityIndicator color="#64748b" size="small" />
            </View>
          ) : (
            <View style={{ height: CHART_HEIGHT }} onLayout={onPlotLayout}>
              {plotWidth > 0 ? (
                <ChartPlot series={series} plotWidth={plotWidth} domain={domain} />
              ) : (
                <View className="flex-1 border-b border-surface-border" />
              )}
            </View>
          )}
        </View>
      </View>
      <View className="flex-row justify-between mt-1" style={{ marginLeft: Y_AXIS_WIDTH }}>
        <Text className="text-slate-500 text-[10px]">{hasHistory ? xMinLabel : "—"}</Text>
        <Text className="text-slate-500 text-[10px]">{hasHistory ? xMaxLabel : "—"}</Text>
      </View>
    </View>
  );
}
