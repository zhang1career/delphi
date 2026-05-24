import { useMemo, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, Text, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { useBetMarketQuoteHistoryQuery, MARKET_QUOTE_REFRESH_MS } from "@/features/bet/hooks";
import { MarketCurrentQuoteColumn } from "@/features/bet/MarketCurrentQuoteColumn";
import {
  buildCurrentQuoteRows,
  buildQuoteHistorySeries,
  buildStackedAreaPaths,
  formatChartAxisDate,
  orderSeriesFor1X2Stack,
  plotPointsToPath,
  seriesToPlotPoints,
  type QuoteChartSeries,
} from "@/features/bet/marketQuoteChartSeries";
import { isMarketType1X2, resolveMarketOutcomeColors } from "@/features/bet/marketQuotePalettes";
import type { MarketQuoteSnapshot } from "@/lib/api/marketQuote";

const CHART_HEIGHT = 80;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TIME_DOMAIN_BUCKET_MS = 5 * 60 * 1000;
const CURRENT_QUOTE_WIDTH = 100;
const Y_AXIS_WIDTH = 36;
const Y_TICKS = [100, 50, 0] as const;

function sevenDayTimeDomain(now = Date.now()): { min: number; max: number } {
  return { min: now - SEVEN_DAYS_MS, max: now };
}

type MarketQuoteHistoryChartProps = {
  marketId: number;
  marketType?: number;
  quote: MarketQuoteSnapshot;
  /** Game title for outcome labels (e.g. parse "Home vs Away"). */
  eventName?: string;
  className?: string;
};

function LineChartPlot({
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

function StackedAreaChartPlot({
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
  const stacked = orderSeriesFor1X2Stack(series);
  const areas = buildStackedAreaPaths(stacked, plotWidth, plotHeight, domain);

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
      {areas.map((area) => {
        if (area.d.length === 0) {
          return null;
        }
        return (
          <Path
            key={area.outcome_code}
            d={area.d}
            fill={area.color}
            stroke={area.color}
            strokeWidth={0.5}
            fillOpacity={0.85}
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
  marketType,
  quote,
  eventName,
  className = "",
}: MarketQuoteHistoryChartProps) {
  const timeBucket = Math.floor(Date.now() / TIME_DOMAIN_BUCKET_MS);
  const timeDomain = useMemo(() => sevenDayTimeDomain(), [timeBucket]);
  const historyQ = useBetMarketQuoteHistoryQuery(String(marketId), {
    interval: "1h",
    from: timeDomain.min,
    to: timeDomain.max,
    refetchInterval: MARKET_QUOTE_REFRESH_MS,
  });
  const [plotWidth, setPlotWidth] = useState(0);

  const outcomeColors = useMemo(
    () => resolveMarketOutcomeColors(marketId, marketType),
    [marketId, marketType],
  );

  const currentRows = useMemo(
    () => buildCurrentQuoteRows(quote, { eventName, colors: outcomeColors }),
    [quote, eventName, outcomeColors],
  );

  const series = useMemo(
    () =>
      buildQuoteHistorySeries(historyQ.data?.items ?? [], {
        eventName,
        colors: outcomeColors,
      }),
    [historyQ.data?.items, eventName, outcomeColors],
  );

  const useStackedArea = isMarketType1X2(marketType);

  const onPlotLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== plotWidth) {
      setPlotWidth(w);
    }
  };

  const xMinLabel = formatChartAxisDate(timeDomain.min);
  const xMaxLabel = formatChartAxisDate(timeDomain.max);

  return (
    <View className={`flex-row ${className}`}>
      <View style={{ width: CURRENT_QUOTE_WIDTH }} className="mr-2 shrink-0 justify-center">
        <MarketCurrentQuoteColumn rows={currentRows} />
      </View>
      <View className="flex-1 min-w-0">
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
                  useStackedArea ? (
                    <StackedAreaChartPlot series={series} plotWidth={plotWidth} domain={timeDomain} />
                  ) : (
                    <LineChartPlot series={series} plotWidth={plotWidth} domain={timeDomain} />
                  )
                ) : (
                  <View className="flex-1 border-b border-surface-border" />
                )}
              </View>
            )}
          </View>
        </View>
        <View className="flex-row justify-between mt-1" style={{ marginLeft: Y_AXIS_WIDTH }}>
          <Text className="text-slate-500 text-[10px]">{xMinLabel}</Text>
          <Text className="text-slate-500 text-[10px]">{xMaxLabel}</Text>
        </View>
      </View>
    </View>
  );
}
