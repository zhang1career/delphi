/**
 * Stable positive id when the catalog or order line omits numeric `kid` but provides
 * `market_id` + outcome/selection code (must match wherever the client builds the same key).
 */
export function surrogateSelectionKidFromMarketOutcome(marketId: number, outcomeCode: string): number {
  const s = `${marketId}\u{1}${outcomeCode}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  return u === 0 ? 1 : u;
}
