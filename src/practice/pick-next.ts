import type { RecognitionItem } from '../music/music';
import {
  chooseWeighted,
  emptyNoteStats,
  noteWeight,
  type NoteStats,
  type SessionQueueEntry,
} from '../training/training';

/**
 * Picks the next note to show: weighted by how shaky it is, while avoiding the
 * items just seen and the ones deliberately deferred after a wrong answer.
 */
export function pickNext(
  candidates: readonly RecognitionItem[],
  stats: Readonly<Record<string, NoteStats>>,
  recentIds: readonly string[],
  deferredQueue: readonly SessionQueueEntry[] = [],
  questionNumber = 1,
): RecognitionItem {
  const blocked = new Set(recentIds.slice(-2));
  const availableAfterDelay = candidates.filter(
    (item) =>
      !deferredQueue.some(
        (entry) =>
          entry.item.id === item.id && entry.notBeforeQuestion > questionNumber,
      ),
  );
  const available =
    availableAfterDelay.length > 2
      ? availableAfterDelay.filter((item) => !blocked.has(item.id))
      : availableAfterDelay.filter((item) => item.id !== recentIds.at(-1));
  const pool =
    available.length > 0
      ? available
      : availableAfterDelay.length > 0
        ? availableAfterDelay
        : candidates;
  return chooseWeighted(
    pool.map((item) => ({
      item,
      weight: noteWeight(stats[item.id] ?? emptyNoteStats(item), Date.now()),
    })),
  ).item;
}
