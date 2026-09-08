import { describe, expect, it } from 'vitest';

import { allRecognitionItems } from '../../music/recognition-items';
import {
  creditNote,
  currentStanding,
  emptyLevelLesson,
  emptyNoteLesson,
  lapseNote,
  levelStanding,
  pathStandings,
  pathTotals,
  phaseOf,
  sectionStandings,
  type LearningLevels,
  type LevelLesson,
} from '../lesson-state';
import { findLevel, LEVELS } from '../levels';

const level = findLevel('treble-middle')!;

/** A level lesson with every note carried to the given number of credits. */
function lessonWith(credits: number, levelId = level.id): LearningLevels {
  const target = findLevel(levelId)!;
  return {
    [levelId]: {
      ...emptyLevelLesson(),
      notes: Object.fromEntries(
        target.items.map((item) => [
          item.id,
          { ...emptyNoteLesson(), introduced: true, credits },
        ]),
      ),
    },
  };
}

describe('credits', () => {
  it('counts one credit per run, however many times the note comes back', () => {
    const first = creditNote(emptyNoteLesson(), 'run-1', 100);
    expect(first.credits).toBe(1);
    const again = creditNote(first, 'run-1', 200);
    expect(again.credits).toBe(1);
    const nextRun = creditNote(again, 'run-2', 300);
    expect(nextRun.credits).toBe(2);
  });

  it('marks a note introduced the moment it is answered at all', () => {
    expect(creditNote(emptyNoteLesson(), 'run-1', 1).introduced).toBe(true);
    expect(lapseNote(emptyNoteLesson()).introduced).toBe(true);
  });

  it('takes back one credit on a miss rather than resetting the note', () => {
    const twice = creditNote(creditNote(emptyNoteLesson(), 'a', 1), 'b', 2);
    const lapsed = lapseNote(twice);
    expect(lapsed.credits).toBe(1);
    expect(lapsed.lapses).toBe(1);
    expect(lapseNote(lapseNote(lapsed)).credits).toBe(0);
  });

  it('clears the lapse once the note comes back', () => {
    const repaired = creditNote(lapseNote(emptyNoteLesson()), 'run-2', 5);
    expect(repaired.lapses).toBe(0);
  });
});

describe('note phases', () => {
  it('reads a note as new, learning, repairing or passed', () => {
    expect(phaseOf(emptyNoteLesson(), level)).toBe('new');
    expect(
      phaseOf({ ...emptyNoteLesson(), introduced: true, credits: 1 }, level),
    ).toBe('learning');
    expect(
      phaseOf(
        { ...emptyNoteLesson(), introduced: true, credits: 1, lapses: 1 },
        level,
      ),
    ).toBe('repair');
    expect(
      phaseOf({ ...emptyNoteLesson(), credits: level.credits }, level),
    ).toBe('passed');
  });
});

describe('level standings', () => {
  it('counts what is learned, unseen and broken', () => {
    const lesson: LevelLesson = {
      ...emptyLevelLesson(),
      notes: {
        'treble:G4': { ...emptyNoteLesson(), credits: 3, introduced: true },
        'treble:E4': {
          ...emptyNoteLesson(),
          credits: 1,
          introduced: true,
          lapses: 2,
        },
        'treble:D4': { ...emptyNoteLesson(), credits: 1, introduced: true },
      },
    };
    expect(levelStanding(level, lesson)).toMatchObject({
      learned: 1,
      total: 7,
      unseen: 4,
      repairing: 1,
    });
  });

  it('opens only the first level on a fresh path', () => {
    const standings = pathStandings({});
    expect(standings[0].status).toBe('available');
    expect(standings.slice(1).every((one) => one.status === 'locked')).toBe(
      true,
    );
    expect(currentStanding(standings)?.level.id).toBe(LEVELS[0].id);
  });

  it('opens the next level only once the one before it is finished', () => {
    const standings = pathStandings(lessonWith(3));
    expect(standings[0].status).toBe('complete');
    expect(standings[1].status).toBe('available');
    expect(standings[2].status).toBe('locked');
  });

  it('leaves a level short while any note is one credit down', () => {
    const standings = pathStandings(lessonWith(2));
    expect(standings[0]).toMatchObject({ status: 'available', learned: 0 });
    expect(pathTotals(lessonWith(2), standings).levelsComplete).toBe(0);
  });

  it('counts a note once for the path, however many levels hold it', () => {
    const levels = lessonWith(3);
    const totals = pathTotals(levels, pathStandings(levels));
    /* Seven notes learned, and the whole curriculum is the denominator. */
    expect(totals).toMatchObject({ learned: 7, levelsComplete: 1 });
    expect(totals.total).toBe(allRecognitionItems().length);
  });

  it("gates each section behind the previous section's mixed level", () => {
    const sections = sectionStandings(lessonWith(3));
    expect(sections[0].status).toBe('available');
    expect(sections[0].levelsComplete).toBe(1);
    /* The treble section still has its capstone to clear, so the bass section waits. */
    expect(sections[1].status).toBe('locked');
  });
});
