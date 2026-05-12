import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { SportSelection } from "@/lib/api/betTypes";

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

/** True when the market has three selections; one row (1 · X · 2). */
export function isThreeWayLineup(lines: SportSelection[]): lines is [SportSelection, SportSelection, SportSelection] {
  return lines.length === 3;
}

type ThreeColMeta = {
  line: SportSelection;
  /** Top-left row: fixed outcome index ("1", "X", or "2"). */
  headline: string;
  /** Centered second line: parsed team name when available, else selection label. */
  caption?: string;
};

function buildThreeColMeta(
  lines: [SportSelection, SportSelection, SportSelection],
  eventName: string,
): ThreeColMeta[] {
  const [homeLine, drawLine, awayLine] = lines;
  const { home, away } = parseEventTeams(eventName);

  /** Top row is fixed 1 · X · 2 so it never repeats the outcome label line below. */
  const col0: ThreeColMeta = {
    line: homeLine,
    headline: "1",
    caption: (home ?? homeLine.label.trim()) || undefined,
  };

  const col1: ThreeColMeta = {
    line: drawLine,
    headline: "X",
    caption: drawLine.label.trim() || undefined,
  };

  const col2: ThreeColMeta = {
    line: awayLine,
    headline: "2",
    caption: (away ?? awayLine.label.trim()) || undefined,
  };

  return [col0, col1, col2];
}

/**
 * One row of three outcome cells (1 · X · 2).
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
        return (
          <Pressable
            key={line.id}
            onPress={() => onSelect(line.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: chosen }}
            accessibilityLabel={`${headline}, ${line.label}`}
            className={`flex-1 min-w-0 rounded-xl border p-3 active:opacity-90 ${
              chosen ? "border-brand bg-surface-card" : "border-surface-border bg-surface"
            }`}
          >
            <Text className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide" numberOfLines={2}>
              {headline}
            </Text>
            {caption !== undefined && caption !== headline ? (
              <Text className="text-slate-100 text-sm font-medium mt-1.5 text-center" numberOfLines={2}>
                {caption}
              </Text>
            ) : (
              <Text className="text-slate-200 text-sm font-medium mt-1.5 text-center" numberOfLines={2}>
                {line.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
