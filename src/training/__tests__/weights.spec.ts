import { describe, expect, it } from 'vitest';

import { hardestFirst, noteWeight, type NoteEvidence } from '../weights';

const NOW = new Date('2026-09-08T12:00').getTime();
const DAY = 86_400_000;

function evidence(patch: Partial<NoteEvidence> = {}): NoteEvidence {
  return {
    itemId: 'treble:C4',
    attempts: 20,
    correct: 18,
    timeouts: 0,
    medianMs: 1200,
    lastPracticedAt: NOW - DAY,
    state: 'recognized',
    ...patch,
  };
}

describe('noteWeight', () => {
  it('ranks a shaky note above a solid one', () => {
    const shaky = noteWeight(evidence({ correct: 8 }), NOW);
    const solid = noteWeight(evidence({ correct: 20 }), NOW);
    expect(shaky).toBeGreaterThan(solid);
  });

  it('treats timeouts as harder evidence than wrong answers', () => {
    const guessed = noteWeight(evidence({ correct: 12, timeouts: 0 }), NOW);
    const timedOut = noteWeight(evidence({ correct: 12, timeouts: 8 }), NOW);
    expect(timedOut).toBeGreaterThan(guessed);
  });

  it('holds back a note answered moments ago', () => {
    const justSeen = noteWeight(evidence({ lastPracticedAt: NOW }), NOW);
    const restedADay = noteWeight(evidence(), NOW);
    expect(justSeen).toBeLessThan(restedADay);
  });

  it('brings back a note left alone for a week', () => {
    const stale = noteWeight(evidence({ lastPracticedAt: NOW - 7 * DAY }), NOW);
    expect(stale).toBeGreaterThan(noteWeight(evidence(), NOW));
  });

  it('counts correct but slow as unfinished business', () => {
    const slow = noteWeight(evidence({ medianMs: 3800 }), NOW);
    const quick = noteWeight(evidence({ medianMs: 900 }), NOW);
    expect(slow).toBeGreaterThan(quick);
  });

  it('gives an unseen note more pull than a rested one, but not a runaway lead', () => {
    const unseen = noteWeight(
      evidence({
        attempts: 0,
        correct: 0,
        lastPracticedAt: null,
        state: 'new',
      }),
      NOW,
    );
    const hardest = noteWeight(
      evidence({ correct: 2, timeouts: 10, medianMs: 4000 }),
      NOW,
    );
    expect(unseen).toBeGreaterThan(noteWeight(evidence(), NOW));
    expect(unseen).toBeLessThan(hardest);
  });

  it('eases off notes already read fluently', () => {
    const fluent = noteWeight(evidence({ state: 'fluent' }), NOW);
    const learning = noteWeight(evidence({ state: 'new' }), NOW);
    expect(fluent).toBeLessThan(learning);
  });

  it('samples a barely-tried note more than a well-established one', () => {
    const thin = noteWeight(evidence({ attempts: 4, correct: 3 }), NOW);
    const established = noteWeight(
      evidence({ attempts: 40, correct: 30 }),
      NOW,
    );
    expect(thin / 4).toBeGreaterThan(0);
    expect(thin).toBeGreaterThan(established * 0.9);
  });

  it('never returns a weight that could stall the picker', () => {
    const weights = [
      evidence({ state: 'fluent', correct: 20, medianMs: 400 }),
      evidence({ attempts: 0, correct: 0, lastPracticedAt: null }),
      evidence({ correct: 0, timeouts: 20, medianMs: null }),
    ].map((note) => noteWeight(note, NOW));
    for (const weight of weights) {
      expect(Number.isFinite(weight)).toBe(true);
      expect(weight).toBeGreaterThan(0);
    }
  });
});

describe('hardestFirst', () => {
  it('orders by weight and ignores notes with no evidence', () => {
    const ranked = hardestFirst(
      [
        evidence({ itemId: 'a', correct: 19 }),
        evidence({ itemId: 'b', correct: 6, timeouts: 6 }),
        evidence({ itemId: 'c', attempts: 0, correct: 0 }),
      ],
      NOW,
    );
    expect(ranked.map((note) => note.itemId)).toEqual(['b', 'a']);
  });
});
