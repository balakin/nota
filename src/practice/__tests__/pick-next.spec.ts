import { describe, expect, it } from 'vitest';
import { pitch, recognitionItem } from '../../music/music';
import { emptyNoteStats, requeueAfterWrong, type NoteStats } from '../../training/training';
import { pickNext } from '../pick-next';

const items = [
  recognitionItem('treble', pitch('G', 4)),
  recognitionItem('treble', pitch('C', 5)),
  recognitionItem('treble', pitch('E', 4)),
  recognitionItem('treble', pitch('A', 4)),
];

function statsFor(list: readonly ReturnType<typeof recognitionItem>[]) {
  return Object.fromEntries(list.map((item) => [item.id, emptyNoteStats(item)])) as Record<
    string,
    NoteStats
  >;
}

describe('pickNext', () => {
  it('never repeats one of the two most recent notes while enough remain', () => {
    const recent = [items[0].id, items[1].id];
    for (let run = 0; run < 40; run += 1) {
      expect(recent).not.toContain(pickNext(items, statsFor(items), recent).id);
    }
  });

  it('skips notes deferred after a wrong answer until their delay has passed', () => {
    const queue = requeueAfterWrong([], items[0], 1, 3);
    expect(pickNext(items, statsFor(items), [], queue, 2).id).not.toBe(items[0].id);
    expect(
      [items[0].id, items[1].id, items[2].id, items[3].id].includes(
        pickNext(items, statsFor(items), [], queue, 5).id,
      ),
    ).toBe(true);
  });

  it('falls back to the full candidate list when everything is blocked', () => {
    const single = [items[0]];
    expect(pickNext(single, statsFor(single), [items[0].id]).id).toBe(items[0].id);
  });
});
