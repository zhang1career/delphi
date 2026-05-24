/** Crowd pick distribution on a market (`GET …/markets` with `include=quote`, detail, batch, history). */

export const MARKET_QUOTE_OUTCOME_CODES = ["home_win", "draw", "away_win"] as const;

export type MarketQuoteOutcome = {
  outcome_code: string;
  pick_count: number;
  /** Share in basis points; 10_000 = 100%. */
  share_bp: number;
};

export type MarketQuoteSnapshot = {
  /** Last snapshot time (epoch ms), or `null` when no picks yet. */
  as_of: number | null;
  total_picks: number;
  outcomes: MarketQuoteOutcome[];
};

export type MarketQuoteBatchItem = {
  market_id: number;
  quote: MarketQuoteSnapshot;
};

export const MARKET_QUOTES_BATCH_MAX = 100;

export type MarketQuoteHistoryInterval = "1h" | "1d";

/** One bucket in `GET …/quote/history` → `data.series[].points[]`. */
export type MarketQuoteHistoryPoint = {
  t: number;
  pick_count: number;
  share_bp: number;
};

/** Per-outcome time series in `GET …/quote/history` → `data.series[]`. */
export type MarketQuoteHistoryOutcomeSeries = {
  outcome_code: string;
  points: MarketQuoteHistoryPoint[];
};

/** Pivot outcome-grouped history into snapshot rows for chart builders. */
export function quoteHistorySeriesToSnapshots(
  series: MarketQuoteHistoryOutcomeSeries[],
): MarketQuoteSnapshot[] {
  const timeMap = new Map<number, Map<string, MarketQuoteOutcome>>();

  for (const s of series) {
    const code = s.outcome_code.trim();
    if (code.length === 0) {
      continue;
    }
    for (const p of s.points) {
      if (!Number.isFinite(p.t) || p.t <= 0) {
        continue;
      }
      let outcomes = timeMap.get(p.t);
      if (!outcomes) {
        outcomes = new Map();
        timeMap.set(p.t, outcomes);
      }
      outcomes.set(code, {
        outcome_code: code,
        pick_count: p.pick_count,
        share_bp: p.share_bp,
      });
    }
  }

  return [...timeMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([t, outcomeMap]) => {
      const outcomes = MARKET_QUOTE_OUTCOME_CODES.map((outcome_code) => {
        const o = outcomeMap.get(outcome_code);
        return (
          o ?? {
            outcome_code,
            pick_count: 0,
            share_bp: 0,
          }
        );
      });
      const total_picks = outcomes.reduce((sum, o) => sum + o.pick_count, 0);
      return { as_of: t, total_picks, outcomes };
    });
}

export function emptyMarketQuoteSnapshot(): MarketQuoteSnapshot {
  return {
    as_of: null,
    total_picks: 0,
    outcomes: MARKET_QUOTE_OUTCOME_CODES.map((outcome_code) => ({
      outcome_code,
      pick_count: 0,
      share_bp: 0,
    })),
  };
}

/** Display share from basis points (10_000 bp = 100%). */
export function formatShareBp(shareBp: number): string {
  if (!Number.isFinite(shareBp) || shareBp <= 0) {
    return "0%";
  }
  const pct = shareBp / 100;
  if (pct >= 10) {
    return `${Math.round(pct)}%`;
  }
  return `${pct.toFixed(1)}%`;
}

export function quoteOutcomeByCode(
  quote: MarketQuoteSnapshot,
  outcomeCode: string,
): MarketQuoteOutcome | undefined {
  const code = outcomeCode.trim();
  if (code.length === 0) {
    return undefined;
  }
  return quote.outcomes.find((o) => o.outcome_code === code);
}
