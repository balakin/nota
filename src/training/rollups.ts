/**
 * Per-note, per-day buckets.
 *
 * Counts add across days, so accuracy over any range is exact. Response times do not:
 * the median of daily medians is not the median of the range, and no amount of sums
 * recovers it. Each bucket therefore also carries a small log-spaced histogram, which
 * *does* merge, and yields a percentile with bounded relative error — the same trick a
 * metrics backend uses. Sums are kept too, so a mean stays available and exact.
 */

export type DayRoll = {
  itemId: string;
  day: string;
  attempts: number;
  correct: number;
  timeouts: number;
  speedAttempts: number;
  speedCorrect: number;
  /** Correct answers only; a wrong answer's duration says nothing about recognition. */
  timed: number;
  sumMs: number;
  /** Counts per histogram bucket, trailing empties trimmed. */
  bins: number[];
};

const DAY_MS = 86_400_000;

/** Bucket k covers [FLOOR * GROWTH^k, FLOOR * GROWTH^(k+1)); ~5% relative error. */
const FLOOR_MS = 150;
const GROWTH = 1.1;
export const BIN_COUNT = 48;

export function binFor(ms: number): number {
  if (ms <= FLOOR_MS) return 0;
  const index = Math.floor(Math.log(ms / FLOOR_MS) / Math.log(GROWTH));
  return Math.min(BIN_COUNT - 1, Math.max(0, index));
}

/** Geometric centre of a bucket, the least-biased single value to report for it. */
function binValue(index: number): number {
  return FLOOR_MS * Math.pow(GROWTH, index + 0.5);
}

export function dayKeyOf(at: number): string {
  const date = new Date(at);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear())}-${month}-${day}`;
}

export function rollKey(itemId: string, day: string): string {
  return `${day}|${itemId}`;
}

export function emptyRoll(itemId: string, day: string): DayRoll {
  return {
    itemId,
    day,
    attempts: 0,
    correct: 0,
    timeouts: 0,
    speedAttempts: 0,
    speedCorrect: 0,
    timed: 0,
    sumMs: 0,
    bins: [],
  };
}

function addToBins(bins: readonly number[], index: number): number[] {
  const next = [...bins];
  while (next.length <= index) next.push(0);
  next[index] += 1;
  return next;
}

export function addAttempt(
  roll: DayRoll,
  outcome: {
    result: 'correct' | 'incorrect' | 'timeout';
    elapsedMs: number | null;
    mode: 'practice' | 'speed';
  },
): DayRoll {
  const correct = outcome.result === 'correct';
  const counted = correct && outcome.elapsedMs !== null;
  return {
    ...roll,
    attempts: roll.attempts + 1,
    correct: roll.correct + (correct ? 1 : 0),
    timeouts: roll.timeouts + (outcome.result === 'timeout' ? 1 : 0),
    speedAttempts: roll.speedAttempts + (outcome.mode === 'speed' ? 1 : 0),
    speedCorrect:
      roll.speedCorrect + (outcome.mode === 'speed' && correct ? 1 : 0),
    timed: roll.timed + (counted ? 1 : 0),
    sumMs: roll.sumMs + (counted ? (outcome.elapsedMs ?? 0) : 0),
    bins: counted
      ? addToBins(roll.bins, binFor(outcome.elapsedMs ?? 0))
      : roll.bins,
  };
}

export type Totals = {
  attempts: number;
  correct: number;
  timeouts: number;
  speedAttempts: number;
  speedCorrect: number;
  timed: number;
  sumMs: number;
  bins: number[];
};

export function emptyTotals(): Totals {
  return {
    attempts: 0,
    correct: 0,
    timeouts: 0,
    speedAttempts: 0,
    speedCorrect: 0,
    timed: 0,
    sumMs: 0,
    bins: [],
  };
}

export function mergeTotals(into: Totals, roll: DayRoll | Totals): Totals {
  const bins = [...into.bins];
  roll.bins.forEach((count, index) => {
    while (bins.length <= index) bins.push(0);
    bins[index] += count;
  });
  return {
    attempts: into.attempts + roll.attempts,
    correct: into.correct + roll.correct,
    timeouts: into.timeouts + roll.timeouts,
    speedAttempts: into.speedAttempts + roll.speedAttempts,
    speedCorrect: into.speedCorrect + roll.speedCorrect,
    timed: into.timed + roll.timed,
    sumMs: into.sumMs + roll.sumMs,
    bins,
  };
}

export function totalsOf(rolls: readonly DayRoll[]): Totals {
  return rolls.reduce(mergeTotals, emptyTotals());
}

export function accuracyOf(
  totals: Pick<Totals, 'attempts' | 'correct'>,
): number {
  return totals.attempts === 0 ? 0 : totals.correct / totals.attempts;
}

/** Exact, because sums merge. */
export function meanMs(totals: Pick<Totals, 'timed' | 'sumMs'>): number | null {
  return totals.timed === 0 ? null : totals.sumMs / totals.timed;
}

/**
 * Estimated from the merged histogram, so it is available over any range. Accurate to
 * the width of one bucket — about 5% — which is far finer than the differences the
 * progress page reports.
 */
export function quantileMs(
  totals: Pick<Totals, 'bins'>,
  q = 0.5,
): number | null {
  const total = totals.bins.reduce((sum, count) => sum + count, 0);
  if (total === 0) return null;
  const target = q * total;
  let seen = 0;
  for (let index = 0; index < totals.bins.length; index += 1) {
    seen += totals.bins[index];
    if (seen >= target) return binValue(index);
  }
  return binValue(totals.bins.length - 1);
}

export function daysAgoKey(days: number, now: number): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return dayKeyOf(start.getTime() - (days - 1) * DAY_MS);
}

/** Rolls are keyed `day|itemId`, so a day-string comparison bounds the range. */
export function rollsWithin(
  rolls: Readonly<Record<string, DayRoll>>,
  days: number | null,
  now: number,
): DayRoll[] {
  const all = Object.values(rolls);
  if (days === null) return all;
  const from = daysAgoKey(days, now);
  return all.filter((roll) => roll.day >= from);
}

export function pruneRolls(
  rolls: Readonly<Record<string, DayRoll>>,
  keepDays: number,
  now: number,
): Record<string, DayRoll> {
  const from = daysAgoKey(keepDays, now);
  return Object.fromEntries(
    Object.entries(rolls).filter(([, roll]) => roll.day >= from),
  );
}
