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
