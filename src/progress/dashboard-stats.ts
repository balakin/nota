import type { SessionSummary } from '../app-state/app-state';
import {
  accuracyOf,
  daysAgoKey,
  emptyTotals,
  mergeTotals,
  quantileMs,
  type DayRoll,
  type Totals,
} from '../training/rollups';

/** null means every bucket ever recorded. */
export type RangeDays = number | null;

export const RANGES: readonly { id: string; days: RangeDays }[] = [
  { id: '7d', days: 7 },
  { id: '14d', days: 14 },
  { id: '30d', days: 30 },
  { id: 'all', days: null },
];

export type DayPoint = {
  day: string;
  accuracy: number;
  seconds: number | null;
  attempts: number;
};

export type DashboardStats = {
  totals: Totals;
  /** The window of the same length immediately before this one, or null over all time. */
  previous: Totals | null;
  byItem: Record<string, Totals>;
  lastSeenByItem: Record<string, string>;
  practicedItems: number;
  previousPracticedItems: number | null;
  practiceSeconds: number;
  previousPracticeSeconds: number | null;
  days: DayPoint[];
};

function windowBounds(days: RangeDays, now: number) {
  if (days === null) return { from: null, previousFrom: null };
  return {
    from: daysAgoKey(days, now),
    previousFrom: daysAgoKey(days * 2, now),
  };
}

function sessionsFrom(
  sessions: readonly SessionSummary[],
  fromDay: string | null,
  toDayExclusive: string | null,
  dayOf: (at: number) => string,
): SessionSummary[] {
  return sessions.filter((session) => {
    const day = dayOf(session.startedAt);
    if (fromDay !== null && day < fromDay) return false;
    if (toDayExclusive !== null && day >= toDayExclusive) return false;
    return true;
  });
}

export function dashboardStats({
  rolls,
  sessions,
  days,
  now,
  dayOf,
}: {
  rolls: Readonly<Record<string, DayRoll>>;
  sessions: readonly SessionSummary[];
  days: RangeDays;
  now: number;
  dayOf: (at: number) => string;
}): DashboardStats {
  const { from, previousFrom } = windowBounds(days, now);
  const all = Object.values(rolls);

  let totals = emptyTotals();
  let previous: Totals | null = previousFrom === null ? null : emptyTotals();
  const byItem: Record<string, Totals> = {};
  const previousItems = new Set<string>();
  const lastSeenByItem: Record<string, string> = {};
  const byDay = new Map<string, Totals>();

  for (const roll of all) {
    const inRange = from === null || roll.day >= from;
    if (inRange) {
      totals = mergeTotals(totals, roll);
      byItem[roll.itemId] = mergeTotals(
        byItem[roll.itemId] ?? emptyTotals(),
        roll,
      );
      byDay.set(
        roll.day,
        mergeTotals(byDay.get(roll.day) ?? emptyTotals(), roll),
      );
    }
    // Last seen is answered over all history: "not in this window" is itself the answer.
    const seen = lastSeenByItem[roll.itemId];
    if (roll.attempts > 0 && (!seen || roll.day > seen))
      lastSeenByItem[roll.itemId] = roll.day;
    if (
      previous !== null &&
      previousFrom !== null &&
      from !== null &&
      roll.day >= previousFrom &&
      roll.day < from
    ) {
      previous = mergeTotals(previous, roll);
      if (roll.attempts > 0) previousItems.add(roll.itemId);
    }
  }

  const inWindow = sessionsFrom(sessions, from, null, dayOf);
  const priorWindow =
    previousFrom === null
      ? null
      : sessionsFrom(sessions, previousFrom, from, dayOf);

  return {
    totals,
    previous,
    byItem,
    lastSeenByItem,
    practicedItems: Object.values(byItem).filter((item) => item.attempts > 0)
      .length,
    previousPracticedItems: previous === null ? null : previousItems.size,
    practiceSeconds: inWindow.reduce(
      (sum, session) => sum + session.practiceSeconds,
      0,
    ),
    previousPracticeSeconds:
      priorWindow === null
        ? null
        : priorWindow.reduce(
            (sum, session) => sum + session.practiceSeconds,
            0,
          ),
    days: [...byDay.entries()]
      .map(([day, dayTotals]) => ({
        day,
        accuracy: Math.round(accuracyOf(dayTotals) * 100),
        seconds:
          quantileMs(dayTotals) === null ? null : quantileMs(dayTotals)! / 1000,
        attempts: dayTotals.attempts,
      }))
      .sort((left, right) => left.day.localeCompare(right.day)),
  };
}

/** Percentage-point change, or null when there is nothing to compare against. */
export function deltaPoints(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null) return null;
  return current - previous;
}
