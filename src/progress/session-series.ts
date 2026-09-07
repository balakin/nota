import type { SessionSummary } from '../app-state/app-state';

export type DayPoint = {
  day: string;
  at: number;
  accuracy: number;
  seconds: number | null;
  attempts: number;
  sessions: number;
};

const DAY_MS = 86_400_000;

/** Local calendar day, as a sortable key. */
export function dayKey(at: number): string {
  const date = new Date(at);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear())}-${month}-${day}`;
}

/** Keeps today and the previous `days - 1` calendar days. */
export function withinDays(
  sessions: readonly SessionSummary[],
  days: number,
  now: number,
): SessionSummary[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const cutoff = today.getTime() - (days - 1) * DAY_MS;
  return sessions.filter((session) => session.startedAt >= cutoff);
}

/**
 * Several sessions a day would otherwise draw several points on one date. Attempts and
 * correct answers add up exactly; medians cannot be merged, so they are averaged weighted
 * by attempts, which keeps a long session from being outvoted by a two-note one.
 */
export function sessionsByDay(sessions: readonly SessionSummary[]): DayPoint[] {
  const buckets = new Map<string, SessionSummary[]>();
  for (const session of sessions) {
    const key = dayKey(session.startedAt);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(session);
    else buckets.set(key, [session]);
  }
  return (
    [...buckets.entries()]
      .map(([day, group]) => {
        const attempts = group.reduce((sum, one) => sum + one.attempts, 0);
        const correct = group.reduce((sum, one) => sum + one.correct, 0);
        const timed = group.filter(
          (one) => one.medianResponseMs !== null && one.attempts > 0,
        );
        const weight = timed.reduce((sum, one) => sum + one.attempts, 0);
        return {
          day,
          at: Math.min(...group.map((one) => one.startedAt)),
          accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
          seconds: weight
            ? timed.reduce(
                (sum, one) => sum + (one.medianResponseMs ?? 0) * one.attempts,
                0,
              ) /
              weight /
              1000
            : null,
          attempts,
          sessions: group.length,
        };
      })
      // A day with no answered notes has no accuracy to report, and would plot as a false 0%.
      .filter((point) => point.attempts > 0)
      .sort((left, right) => left.day.localeCompare(right.day))
  );
}
