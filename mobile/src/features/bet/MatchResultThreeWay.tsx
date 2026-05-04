import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { SportSelection } from "@/lib/api/betTypes";
import { formatDecimalOddsFromMillis } from "@/lib/api/betTypes";

/** Split "Home vs Away" style event titles for column headers (case-insensitive). */
const EVENT_VS_SPLIT = /\s+vs\.?\s+|\s+v\s+/i;

export function parseEventTeams(eventName: string): { home: string | null; away: string | null } {
  const t = eventName.trim();
  if (t.length === 0) {
    return { home: null, away: null };
  }
  const parts = t.split(EVENT_VS_SPLIT).map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length >= 2) {
    const home = parts[0] ?? null;
    const away = parts.slice(1).join(" vs ") || null;
    return { home, away };
  }
  return { home: null, away: null };
}

/** True when the market has three selections; shown as one row (1 · X · 2). API order should be home · draw · away. */
export function isThreeWayLineup(lines: SportSelection[]): lines is [SportSelection, SportSelection, SportSelection] {
  return lines.length === 3;
}

type ThreeColMeta = {
  line: SportSelection;
  /** Short header (team name or "X"). */
  headline: string;
  /** Optional second line (e.g. outcome label from CMS). */
  caption?: string;
};

function buildThreeColMeta(
  lines: [SportSelection, SportSelection, SportSelection],
  eventName: string,
): ThreeColMeta[] {
  const [homeLine, drawLine, awayLine] = lines;
  const { home, away } = parseEventTeams(eventName);

  const col0: ThreeColMeta =
    home !== null
      ? { line: homeLine, headline: home, caption: homeLine.label.trim() || undefined }
      : { line: homeLine, headline: homeLine.label.trim() || "1" };

  const col1: ThreeColMeta = {
    line: drawLine,
    headline: "X",
    caption: drawLine.label.trim() || undefined,
  };

  const col2: ThreeColMeta =
    away !== null
      ? { line: awayLine, headline: away, caption: awayLine.label.trim() || undefined }
      : { line: awayLine, headline: awayLine.label.trim() || "2" };

  return [col0, col1, col2];
}

/**
 * One row of three odds cells (1 · X · 2), matching common sportsbook match-result layout.
 */
export function MatchResultThreeWayRow({
  lines,
  eventName,
  selectedKid,
  onSelect,
}: {
  lines: [SportSelection, SportSelection, SportSelection];
  eventName: string;
  selectedKid: number | null;
  onSelect: (kid: number) => void;
}) {
  const columns = useMemo(() => buildThreeColMeta(lines, eventName), [lines, eventName]);

  return (
    <View className="flex-row gap-2 px-4">
      {columns.map(({ line, headline, caption }) => {
        const chosen = selectedKid === line.id;
        const odds = formatDecimalOddsFromMillis(line.current_odds_millis);
        return (
          <Pressable
            key={line.id}
            onPress={() => onSelect(line.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: chosen }}
            accessibilityLabel={`${headline}, odds ${odds}`}
            className={`flex-1 min-w-0 rounded-xl border p-3 active:opacity-90 ${
              chosen ? "border-brand bg-surface-card" : "border-surface-border bg-surface"
            }`}
          >
            <Text className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide" numberOfLines={2}>
              {headline}
            </Text>
            <Text className="text-brand-muted text-xl font-bold mt-1.5 text-center">{odds}</Text>
            {caption !== undefined && caption !== headline ? (
              <Text className="text-slate-500 text-[10px] mt-1 text-center" numberOfLines={2}>
                {caption}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
