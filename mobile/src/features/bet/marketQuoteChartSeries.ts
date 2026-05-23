import {
  MARKET_QUOTE_OUTCOME_CODES,
  quoteOutcomeByCode,
  type MarketQuoteSnapshot,
} from "@/lib/api/marketQuote";

export type QuoteChartPoint = {
  t: number;
  /** Share percentage 0–100 derived from `share_bp`. */
  sharePct: number;
};

export type QuoteChartSeries = {
  outcome_code: string;
  label: string;
  color: string;
  points: QuoteChartPoint[];
};

export const QUOTE_OUTCOME_CHART_COLORS: Record<string, string> = {
  home_win: "#6366f1",
  draw: "#94a3b8",
  away_win: "#818cf8",
};

export const QUOTE_OUTCOME_SHORT_LABELS: Record<string, string> = {
  home_win: "1",
  draw: "X",
  away_win: "2",
};

const EVENT_VS_SPLIT = /\s+vs\.?\s+|\s+v\s+/i;

export function parseEventTeamsForChart(eventName: string): { home: string | null; away: string | null } {
  const t = eventName.trim();
  if (t.length === 0) {
    return { home: null, away: null };
  }
  const parts = t.split(EVENT_VS_SPLIT).map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length >= 2) {
    return { home: parts[0] ?? null, away: parts.slice(1).join(" vs ") || null };
  }
  return { home: null, away: null };
}

function outcomeLegendLabel(
  outcomeCode: string,
  teams: { home: string | null; away: string | null },
): string {
  if (outcomeCode === "home_win" && teams.home) {
    return teams.home;
  }
  if (outcomeCode === "away_win" && teams.away) {
    return teams.away;
  }
  if (outcomeCode === "draw") {
    return "Draw";
  }
  return QUOTE_OUTCOME_SHORT_LABELS[outcomeCode] ?? outcomeCode;
}

/** Compact axis label: `mm-dd`. */
export function formatChartAxisDate(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function buildQuoteHistorySeries(
  items: MarketQuoteSnapshot[],
  options?: { eventName?: string },
): QuoteChartSeries[] {
  const teams = parseEventTeamsForChart(options?.eventName ?? "");
  const sorted = items
    .filter((item) => item.as_of !== null && item.as_of > 0)
    .slice()
    .sort((a, b) => (a.as_of ?? 0) - (b.as_of ?? 0));

  return MARKET_QUOTE_OUTCOME_CODES.map((outcome_code) => {
    const points: QuoteChartPoint[] = sorted.map((snap) => {
      const outcome = quoteOutcomeByCode(snap, outcome_code);
      const shareBp = outcome?.share_bp ?? 0;
      return {
        t: snap.as_of as number,
        sharePct: shareBp / 100,
      };
    });
    return {
      outcome_code,
      label: outcomeLegendLabel(outcome_code, teams),
      color: QUOTE_OUTCOME_CHART_COLORS[outcome_code] ?? "#64748b",
      points,
    };
  });
}

export function quoteHistoryTimeDomain(series: QuoteChartSeries[]): { min: number; max: number } | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const s of series) {
    for (const p of s.points) {
      if (p.t < min) {
        min = p.t;
      }
      if (p.t > max) {
        max = p.t;
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }
  return { min, max };
}

type PlotPoint = { x: number; y: number };

export function seriesToPlotPoints(
  points: QuoteChartPoint[],
  plotWidth: number,
  plotHeight: number,
  domain: { min: number; max: number },
): PlotPoint[] {
  if (points.length === 0 || plotWidth <= 0 || plotHeight <= 0) {
    return [];
  }
  const span = domain.max - domain.min;
  return points.map((p, idx) => {
    const xRatio = span > 0 ? (p.t - domain.min) / span : points.length > 1 ? idx / (points.length - 1) : 0.5;
    const yRatio = Math.min(1, Math.max(0, p.sharePct / 100));
    return {
      x: xRatio * plotWidth,
      y: plotHeight - yRatio * plotHeight,
    };
  });
}

export function plotPointsToPath(plotPoints: PlotPoint[]): string {
  if (plotPoints.length === 0) {
    return "";
  }
  return plotPoints
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}
