import { median, type MasteryState, type NoteStats } from './training';

/** How far back the picker looks. Older evidence says little about today's reading. */
export const EVIDENCE_DAYS = 14;

const DAY_MS = 86_400_000;
/** Answers slower than this are worth revisiting even when they are correct. */
const COMFORTABLE_MS = 2000;

export type NoteEvidence = {
  itemId: string;
  /** Attempts inside the evidence window, not for all time. */
  attempts: number;
  correct: number;
  timeouts: number;
  medianMs: number | null;
  lastPracticedAt: number | null;
  state: MasteryState;
};

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * How much a note deserves the next question, as a product of independent signals.
 * Multiplying keeps each one's meaning intact: a note that is both inaccurate and long
 * unseen outranks one that is merely either, without any single term dominating.
 */
export function noteWeight(evidence: NoteEvidence, now: number): number {
  // Notes with no recent evidence have to appear or they can never improve. A note never
  // seen at all leads one that was simply not practiced lately.
  if (evidence.attempts === 0) return evidence.lastPracticedAt === null ? 6 : 4;

  const accuracy = evidence.correct / evidence.attempts;
  // Rises steeply as accuracy falls, so the genuinely hard notes lead.
  const difficulty = 1 + 3 * Math.pow(1 - accuracy, 1.5);
  // A timeout is stronger evidence of not knowing than a wrong guess.
  const hesitation =
    1 + clamp((evidence.timeouts / evidence.attempts) * 3, 0, 1.5);
  // Correct but slow still means it is being worked out rather than recognized.
  const slowness =
    evidence.medianMs === null
      ? 1
      : clamp(evidence.medianMs / COMFORTABLE_MS, 0.8, 2);
  // Spacing: something answered moments ago should not come straight back.
  const days =
    evidence.lastPracticedAt === null
      ? EVIDENCE_DAYS
      : (now - evidence.lastPracticedAt) / DAY_MS;
  const recency = clamp(0.35 + days * 0.5, 0.35, 3);
  // A handful of attempts is not yet a verdict; keep sampling it.
  const coverage = evidence.attempts < 8 ? 1.6 : 1;
  const mastery =
    evidence.state === 'fluent'
      ? 0.45
      : evidence.state === 'recognized'
        ? 0.8
        : 1;

  return difficulty * hesitation * slowness * recency * coverage * mastery;
}

/**
 * The picker reads the note's own recent attempts rather than the day buckets: they are
 * already timestamped, bounded at 40, and update as the session runs, so a note missed
 * twice in the last minute is reweighted immediately.
 */
export function evidenceFromStats(
  stats: NoteStats,
  now: number,
  windowDays = EVIDENCE_DAYS,
): NoteEvidence {
  const from = now - windowDays * DAY_MS;
  const recent = stats.recentAttempts.filter((attempt) => attempt.at >= from);
  const times = recent
    .filter(
      (attempt) => attempt.result === 'correct' && attempt.elapsedMs !== null,
    )
    .map((attempt) => attempt.elapsedMs ?? 0);
  return {
    itemId: stats.itemId,
    attempts: recent.length,
    correct: recent.filter((attempt) => attempt.result === 'correct').length,
    timeouts: recent.filter((attempt) => attempt.result === 'timeout').length,
    medianMs: median(times),
    lastPracticedAt: stats.lastPracticedAt,
    state: stats.state,
  };
}

/** Hardest first — the same ordering the picker uses, so the panel and the session agree. */
export function hardestFirst(
  evidence: readonly NoteEvidence[],
  now: number,
): NoteEvidence[] {
  return [...evidence]
    .filter((note) => note.attempts > 0)
    .sort((left, right) => noteWeight(right, now) - noteWeight(left, now));
}
