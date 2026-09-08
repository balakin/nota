import type { Clef, RecognitionItem } from '../music/music';
import type { KeyboardWindow } from '../piano/piano-layout';
import type { NormalizedAnswer } from '../training/input';
import type {
  AnswerResult,
  Attempt,
  InputMode,
  MasteryState,
  PracticeMode,
  SessionQueueEntry,
} from '../training/training';

export const SESSION_DURATIONS = [2, 5, 10] as const;
export type SessionDuration = (typeof SESSION_DURATIONS)[number];

/** How long a wrong answer stays on screen before the next note appears. */
export const CORRECTION_DELAY = 650;
export const CORRECT_DELAY = 280;

export type RuntimeOutcome = Attempt & {
  itemId: string;
  stateBefore: MasteryState;
  stateAfter: MasteryState;
};

export type Feedback = {
  result: AnswerResult;
  item: RecognitionItem;
  elapsedMs: number | null;
  answer?: NormalizedAnswer;
};

export type RuntimeSession = {
  id: string;
  startedAt: number;
  durationSeconds: number;
  mode: PracticeMode;
  /** The Speed deadline this session started with, so changing the setting mid-session cannot move it. */
  speedDeadlineMs: number;
  input: InputMode;
  clefs: Clef[];
  candidates: RecognitionItem[];
  keyboardWindow: KeyboardWindow;
  current: RecognitionItem;
  currentStartedAt: number;
  deadlineMs: number | null;
  questionNumber: number;
  recentItemIds: string[];
  outcomes: RuntimeOutcome[];
  deferredQueue: SessionQueueEntry[];
  paused: boolean;
  pausedAt: number | null;
};
