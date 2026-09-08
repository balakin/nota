import { LEVELS, SECTIONS, type Level, type Section } from './levels';

/**
 * What the path knows about one note inside one level.
 *
 * A credit is earned by retrieving the note correctly, and a run may credit a note only
 * once: recalling something once in each of three spaced runs retains far better than
 * recalling it three times in one, and the extra reps inside a single run buy almost
 * nothing. So the state a level cares about is *how many runs* have gone well, not how
 * many questions.
 */
export type NoteLesson = {
  introduced: boolean;
  credits: number;
  /** The run that last credited the note; a repeat inside that run earns nothing. */
  lastRunId: string | null;
  lastCreditAt: number;
  /** Misses since the last credit. What puts a note at the front of the next run. */
  lapses: number;
};

export type LevelLesson = {
  notes: Record<string, NoteLesson>;
  runs: number;
  completedAt: number | null;
};

export type LearningLevels = Record<string, LevelLesson>;

export type NotePhase = 'new' | 'learning' | 'repair' | 'passed';
export type LevelStatus = 'locked' | 'available' | 'complete';

export function emptyNoteLesson(): NoteLesson {
  return {
    introduced: false,
    credits: 0,
    lastRunId: null,
    lastCreditAt: 0,
    lapses: 0,
  };
}

export function emptyLevelLesson(): LevelLesson {
  return { notes: {}, runs: 0, completedAt: null };
}

export function noteLessonOf(
  lesson: LevelLesson | undefined,
  itemId: string,
): NoteLesson {
  return lesson?.notes[itemId] ?? emptyNoteLesson();
}

/** A correct answer. Only the first one in a given run moves the note forward. */
export function creditNote(
  note: NoteLesson,
  runId: string,
  at: number,
): NoteLesson {
  if (note.lastRunId === runId) return { ...note, introduced: true, lapses: 0 };
  return {
    introduced: true,
    credits: note.credits + 1,
    lastRunId: runId,
    lastCreditAt: at,
    lapses: 0,
  };
}

/**
 * A miss. It costs a credit rather than resetting the note: one bad answer is evidence
 * that the last run's credit was thin, not that everything before it never happened.
 */
export function lapseNote(note: NoteLesson): NoteLesson {
  return {
    ...note,
    introduced: true,
    credits: Math.max(0, note.credits - 1),
    lapses: note.lapses + 1,
  };
}

export function isPassed(note: NoteLesson, level: Level): boolean {
  return note.credits >= level.credits;
}

export function phaseOf(note: NoteLesson, level: Level): NotePhase {
  if (isPassed(note, level)) return 'passed';
  if (note.lapses > 0) return 'repair';
  return note.introduced ? 'learning' : 'new';
}

export type LevelStanding = {
  level: Level;
  status: LevelStatus;
  learned: number;
  total: number;
  runs: number;
  /** Notes that have never been shown; what a run can still introduce. */
  unseen: number;
  /** Notes that broke since their last credit. */
  repairing: number;
};

export function levelStanding(
  level: Level,
  lesson: LevelLesson | undefined,
): Omit<LevelStanding, 'status'> {
  const phases = level.items.map((item) =>
    phaseOf(noteLessonOf(lesson, item.id), level),
  );
  return {
    level,
    learned: phases.filter((phase) => phase === 'passed').length,
    total: level.items.length,
    runs: lesson?.runs ?? 0,
    unseen: phases.filter((phase) => phase === 'new').length,
    repairing: phases.filter((phase) => phase === 'repair').length,
  };
}

/**
 * Every level in path order, each gated behind the one before it. Because sections are
 * laid out in order and their last level is the mixed one, this also gates each section
 * behind the previous section's capstone.
 */
export function pathStandings(
  levels: LearningLevels,
  ordered: readonly Level[] = LEVELS,
): LevelStanding[] {
  let previousComplete = true;
  return ordered.map((level) => {
    const standing = levelStanding(level, levels[level.id]);
    const complete = standing.learned === standing.total;
    const status: LevelStatus = complete
      ? 'complete'
      : previousComplete
        ? 'available'
        : 'locked';
    previousComplete = previousComplete && complete;
    return { ...standing, status };
  });
}

export type SectionStanding = {
  section: Section;
  levels: LevelStanding[];
  levelsComplete: number;
  status: LevelStatus;
};

export function sectionStandings(levels: LearningLevels): SectionStanding[] {
  const byId = new Map(
    pathStandings(levels).map((standing) => [standing.level.id, standing]),
  );
  return SECTIONS.map((section) => {
    const standings = section.levels
      .map((level) => byId.get(level.id))
      .filter((standing): standing is LevelStanding => Boolean(standing));
    const complete = standings.every(
      (standing) => standing.status === 'complete',
    );
    return {
      section,
      levels: standings,
      levelsComplete: standings.filter(
        (standing) => standing.status === 'complete',
      ).length,
      status: complete
        ? 'complete'
        : standings.some((standing) => standing.status !== 'locked')
          ? 'available'
          : 'locked',
    };
  });
}

/** The level the path is waiting on: the first one open and unfinished. */
export function currentStanding(
  standings: readonly LevelStanding[],
): LevelStanding | null {
  return standings.find((standing) => standing.status === 'available') ?? null;
}

/**
 * Counts distinct notes, not level slots: a note lives in a block level and again in the
 * mixed level that follows, and a learner counting their progress means the note.
 */
export function pathTotals(
  levels: LearningLevels,
  standings: readonly LevelStanding[],
): { learned: number; total: number; levelsComplete: number } {
  const learned = new Set<string>();
  const total = new Set<string>();
  for (const standing of standings)
    for (const item of standing.level.items) {
      total.add(item.id);
      if (
        isPassed(
          noteLessonOf(levels[standing.level.id], item.id),
          standing.level,
        )
      )
        learned.add(item.id);
    }
  return {
    learned: learned.size,
    total: total.size,
    levelsComplete: standings.filter((one) => one.status === 'complete').length,
  };
}
