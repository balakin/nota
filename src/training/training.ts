import type { Clef, RecognitionItem } from '../music/music';

export type MasteryState = 'new' | 'recognized' | 'fluent';
export type PracticeMode = 'practice' | 'speed';
export type InputMode = 'piano' | 'names' | 'midi';
export type AnswerResult = 'correct' | 'incorrect' | 'timeout';

export type Attempt = {
  sessionId: string;
  input?: InputMode;
  result: AnswerResult;
  elapsedMs: number | null;
  mode: PracticeMode;
  at: number;
};

export type NoteStats = {
  itemId: string;
  clef: Clef;
  pitchId: string;
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  timeouts: number;
  responseTimes: number[];
  speedResponseTimes: number[];
  speedAttempts: number;
  speedCorrect: number;
  speedTimeouts: number;
  state: MasteryState;
  reviewLevel: number;
  nextDueAt: number;
  lastPracticedAt: number | null;
  sessions: string[];
  recentAttempts: Attempt[];
};

/** Speed mode's per-note deadline is the learner's to choose; two seconds is the default. */
export const DEFAULT_SPEED_DEADLINE_MS = 2000;
export const SPEED_DEADLINE_OPTIONS_MS = [
  1000, 1500, 2000, 3000, 5000,
] as const;

/** Keeps a stored or hand-edited deadline inside the offered span. */
export function clampSpeedDeadlineMs(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return DEFAULT_SPEED_DEADLINE_MS;
  const first = SPEED_DEADLINE_OPTIONS_MS[0];
  const last = SPEED_DEADLINE_OPTIONS_MS[SPEED_DEADLINE_OPTIONS_MS.length - 1];
  return Math.min(last, Math.max(first, Math.round(value)));
}

/** Practice only puts a note on the clock once it is already familiar. */
export const PRACTICE_DEADLINES_MS = {
  new: null,
  recognized: 3000,
  fluent: 2500,
} as const;

export function deadlineRemainingMs(
  startedAt: number,
  now: number,
  deadlineMs: number,
): number {
  return Math.max(0, deadlineMs - (now - startedAt));
}

export function isDeadlineReached(
  startedAt: number,
  now: number,
  deadlineMs: number,
): boolean {
  return deadlineRemainingMs(startedAt, now, deadlineMs) === 0;
}

export function adaptiveDeadlineMs(
  stats: Pick<NoteStats, 'state'>,
  mode: PracticeMode,
  speedDeadlineMs: number = DEFAULT_SPEED_DEADLINE_MS,
): number | null {
  if (mode === 'speed') return clampSpeedDeadlineMs(speedDeadlineMs);
  return PRACTICE_DEADLINES_MS[stats.state];
}

export const MASTERY_THRESHOLDS = {
  recognizedAttempts: 8,
  recognizedAccuracy: 0.8,
  recognizedMedianMs: 2500,
  fluentAttempts: 20,
  fluentSessions: 2,
  fluentAccuracy: 0.9,
  fluentFailureRate: 0.1,
  fluentMedianMs: 1500,
} as const;

export const REVIEW_INTERVALS_MS = [
  0,
  5 * 60_000,
  24 * 60 * 60_000,
  3 * 86_400_000,
  7 * 86_400_000,
  14 * 86_400_000,
  30 * 86_400_000,
] as const;

export function emptyNoteStats(item: RecognitionItem): NoteStats {
  return {
    itemId: item.id,
    clef: item.clef,
    pitchId: `${item.pitch.name}${item.pitch.octave}`,
    totalAttempts: 0,
    correctAttempts: 0,
    incorrectAttempts: 0,
    timeouts: 0,
    responseTimes: [],
    speedResponseTimes: [],
    speedAttempts: 0,
    speedCorrect: 0,
    speedTimeouts: 0,
    state: 'new',
    reviewLevel: 0,
    nextDueAt: 0,
    lastPracticedAt: null,
    sessions: [],
    recentAttempts: [],
  };
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function accuracy(
  stats: Pick<NoteStats, 'totalAttempts' | 'correctAttempts'>,
): number {
  return stats.totalAttempts === 0
    ? 0
    : stats.correctAttempts / stats.totalAttempts;
}

export function recentAccuracy(stats: NoteStats): number {
  if (stats.recentAttempts.length === 0) return 0;
  return (
    stats.recentAttempts.filter((attempt) => attempt.result === 'correct')
      .length / stats.recentAttempts.length
  );
}

export function medianResponseTime(stats: NoteStats): number | null {
  return median(stats.responseTimes);
}

function deriveState(stats: NoteStats): MasteryState {
  if (stats.totalAttempts === 0) return 'new';
  const recognized =
    stats.totalAttempts >= MASTERY_THRESHOLDS.recognizedAttempts &&
    recentAccuracy(stats) >= MASTERY_THRESHOLDS.recognizedAccuracy &&
    (median(stats.responseTimes) ?? Number.POSITIVE_INFINITY) <=
      MASTERY_THRESHOLDS.recognizedMedianMs;

  const speedFailureRate =
    stats.speedAttempts === 0
      ? 1
      : (stats.speedAttempts - stats.speedCorrect) / stats.speedAttempts;
  const fluent =
    stats.speedAttempts >= MASTERY_THRESHOLDS.fluentAttempts &&
    stats.sessions.length >= MASTERY_THRESHOLDS.fluentSessions &&
    stats.speedCorrect / stats.speedAttempts >=
      MASTERY_THRESHOLDS.fluentAccuracy &&
    speedFailureRate <= MASTERY_THRESHOLDS.fluentFailureRate &&
    (median(stats.speedResponseTimes) ?? Number.POSITIVE_INFINITY) <=
      MASTERY_THRESHOLDS.fluentMedianMs;

  if (fluent) return 'fluent';
  if (recognized) return 'recognized';
  return 'new';
}

export function updateReviewLevel(
  previous: NoteStats,
  result: AnswerResult,
  elapsedMs: number | null,
): number {
  if (result !== 'correct') return Math.max(0, previous.reviewLevel - 2);
  const fastEnough =
    elapsedMs !== null && elapsedMs <= MASTERY_THRESHOLDS.recognizedMedianMs;
  return Math.min(
    REVIEW_INTERVALS_MS.length - 1,
    previous.reviewLevel + (fastEnough ? 1 : 0),
  );
}

export function nextReviewAt(reviewLevel: number, now: number): number {
  return (
    now +
    REVIEW_INTERVALS_MS[
      Math.max(0, Math.min(reviewLevel, REVIEW_INTERVALS_MS.length - 1))
    ]
  );
}

export function recordOutcome(
  previous: NoteStats,
  outcome: {
    result: AnswerResult;
    elapsedMs: number | null;
    mode: PracticeMode;
    input?: InputMode;
    sessionId: string;
    at?: number;
  },
): NoteStats {
  const at = outcome.at ?? Date.now();
  const attempts = [...previous.recentAttempts, { ...outcome, at }].slice(-40);
  const responseTimes =
    outcome.result === 'correct' && outcome.elapsedMs !== null
      ? [...previous.responseTimes, outcome.elapsedMs].slice(-40)
      : previous.responseTimes;
  const speedResponseTimes =
    outcome.mode === 'speed' &&
    outcome.result === 'correct' &&
    outcome.elapsedMs !== null
      ? [...previous.speedResponseTimes, outcome.elapsedMs].slice(-40)
      : previous.speedResponseTimes;
  const sessions = previous.sessions.includes(outcome.sessionId)
    ? previous.sessions
    : [...previous.sessions, outcome.sessionId].slice(-20);
  const next: NoteStats = {
    ...previous,
    totalAttempts: previous.totalAttempts + 1,
    correctAttempts:
      previous.correctAttempts + (outcome.result === 'correct' ? 1 : 0),
    incorrectAttempts:
      previous.incorrectAttempts + (outcome.result === 'incorrect' ? 1 : 0),
    timeouts: previous.timeouts + (outcome.result === 'timeout' ? 1 : 0),
    responseTimes,
    speedResponseTimes,
    speedAttempts: previous.speedAttempts + (outcome.mode === 'speed' ? 1 : 0),
    speedCorrect:
      previous.speedCorrect +
      (outcome.mode === 'speed' && outcome.result === 'correct' ? 1 : 0),
    speedTimeouts:
      previous.speedTimeouts +
      (outcome.mode === 'speed' && outcome.result === 'timeout' ? 1 : 0),
    reviewLevel: updateReviewLevel(previous, outcome.result, outcome.elapsedMs),
    nextDueAt: 0,
    lastPracticedAt: at,
    sessions,
    recentAttempts: attempts,
  };
  next.state = deriveState(next);
  next.nextDueAt = nextReviewAt(next.reviewLevel, at);
  return next;
}

export type CandidateWeight = { item: RecognitionItem; weight: number };

export function noteWeight(stats: NoteStats, now: number): number {
  let weight = 1;
  if (stats.nextDueAt <= now && stats.totalAttempts > 0) weight += 7;
  if (stats.timeouts > 0) weight += Math.min(6, stats.timeouts * 1.5);
  if (stats.incorrectAttempts > 0)
    weight += Math.min(5, stats.incorrectAttempts);
  if (stats.state === 'recognized') weight += 2;
  if (stats.state === 'fluent') weight *= 0.6;
  return weight;
}

export function weightedCandidates(
  items: readonly RecognitionItem[],
  statsById: Readonly<Record<string, NoteStats>>,
  now = Date.now(),
): CandidateWeight[] {
  return items.map((item) => ({
    item,
    weight: noteWeight(statsById[item.id] ?? emptyNoteStats(item), now),
  }));
}

export function chooseWeighted<T extends { weight: number }>(
  items: readonly T[],
  random = Math.random,
): T {
  if (items.length === 0) throw new Error('Cannot choose from an empty list');
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

export function weakestNotes(
  stats: readonly NoteStats[],
  limit = 4,
): NoteStats[] {
  return [...stats]
    .filter((item) => item.totalAttempts > 0)
    .sort((a, b) => {
      const aScore =
        accuracy(a) -
        (median(a.responseTimes) ?? 5000) / 10_000 -
        a.timeouts / 100;
      const bScore =
        accuracy(b) -
        (median(b.responseTimes) ?? 5000) / 10_000 -
        b.timeouts / 100;
      return aScore - bScore;
    })
    .slice(0, limit);
}

export type SessionQueueEntry = {
  item: RecognitionItem;
  notBeforeQuestion: number;
};

export function requeueAfterWrong(
  queue: readonly SessionQueueEntry[],
  item: RecognitionItem,
  currentQuestion: number,
  delay = 3,
): SessionQueueEntry[] {
  return [...queue, { item, notBeforeQuestion: currentQuestion + delay }];
}
