import { MARKET_QUOTE_OUTCOME_CODES } from "@/lib/api/marketQuote";

/** Catalog market type: synthetic 1X2 (home_win / draw / away_win). */
export const MARKET_TYPE_1X2 = 0;

/**
 * Economist-inspired triads for 1X2 legs (home / draw / away).
 * Picked deterministically per market so colors stay stable across refreshes.
 */
export const MARKET_TYPE_1X2_PALETTES: ReadonlyArray<readonly [string, string, string]> = [
  ["#E3120B", "#3D7648", "#006BA6"],
  ["#C41230", "#5A8F6B", "#1E5AA8"],
  ["#D41716", "#4A7C59", "#0077B6"],
  ["#B91C1C", "#2F6B4F", "#2563EB"],
  ["#DC2626", "#059669", "#0284C7"],
  ["#BE123C", "#047857", "#0369A1"],
] as const;

const DEFAULT_OUTCOME_COLORS: Record<string, string> = {
  home_win: "#6366f1",
  draw: "#94a3b8",
  away_win: "#818cf8",
};

export function isMarketType1X2(type: number | undefined): boolean {
  return type === MARKET_TYPE_1X2;
}

export function pickType1X2Palette(marketId: number): readonly [string, string, string] {
  const idx = Math.abs(marketId) % MARKET_TYPE_1X2_PALETTES.length;
  return MARKET_TYPE_1X2_PALETTES[idx] ?? MARKET_TYPE_1X2_PALETTES[0];
}

/** Outcome colors for list-row “当前行情” and history chart (chart follows these). */
export function resolveMarketOutcomeColors(
  marketId: number,
  marketType: number | undefined,
): Record<string, string> {
  if (isMarketType1X2(marketType)) {
    const [home, draw, away] = pickType1X2Palette(marketId);
    return {
      home_win: home,
      draw,
      away_win: away,
    };
  }
  const colors: Record<string, string> = { ...DEFAULT_OUTCOME_COLORS };
  for (const code of MARKET_QUOTE_OUTCOME_CODES) {
    if (!colors[code]) {
      colors[code] = "#64748b";
    }
  }
  return colors;
}
