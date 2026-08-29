import { useCallback, useEffect, useRef, useState } from 'react';
import { I18nProvider } from '@lingui/react';
import { Icon } from './components/Icon';
import { NoteNamePad } from './components/NoteNamePad';
import { Piano } from './components/Piano';
import { NotationStaff } from './notation/notation-staff';
import { activateLocale, browserLocale, i18n } from './i18n/i18n';
import { useTranslation } from './i18n/use-translation';
import {
  allRecognitionItems,
  createInitialState,
  type AppSettings,
  type Locale,
  type PersistedState,
  type SessionSummary,
} from './app/state';
import {
  accuracy,
  adaptiveDeadlineMs,
  deadlineRemainingMs,
  chooseWeighted,
  emptyNoteStats,
  median,
  medianResponseTime,
  noteWeight,
  recordOutcome,
  SPEED_DEADLINE_MS,
  unlockedItems,
  weakestNotes,
  type AnswerResult,
  type Attempt,
  type InputMode,
  type MasteryState,
  type NoteStats,
  type PracticeMode,
  type SessionQueueEntry,
  requeueAfterWrong,
} from './training/training';
import { keyboardAnswer, type NormalizedAnswer } from './training/input';
import type { Clef, RecognitionItem } from './music/music';
import { CLEF_LABELS, displayNoteName } from './music/music';
import { planKeyboard, type KeyboardWindow } from './piano/piano-layout';
import { loadPersistedState, savePersistedState } from './storage/indexed-db';

const SESSION_DURATIONS = [2, 5, 10] as const;
const CORRECTION_DELAY = 650;

type Page = 'train' | 'progress' | 'settings' | 'research';
const PAGES: readonly Page[] = ['train', 'progress', 'settings', 'research'];

function pageFromHash(hash: string): Page {
  const candidate = hash.replace(/^#/, '') as Page;
  return PAGES.includes(candidate) ? candidate : 'train';
}

type RuntimeOutcome = Attempt & {
  itemId: string;
  stateBefore: MasteryState;
  stateAfter: MasteryState;
};
type Feedback = {
  result: AnswerResult;
  item: RecognitionItem;
  elapsedMs: number | null;
  answer?: NormalizedAnswer;
};
type RuntimeSession = {
  id: string;
  startedAt: number;
  durationSeconds: number;
  mode: PracticeMode;
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

function initialFromStorage(): PersistedState {
  const locale = browserLocale();
  return createInitialState({ locale, naming: locale === 'ru' ? 'solfege' : 'letters' });
}

function pickNext(
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
        (entry) => entry.item.id === item.id && entry.notBeforeQuestion > questionNumber,
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

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function formatResponse(ms: number | null, lessSecond = '< 1s', secondUnit = 's'): string {
  if (ms === null) return '—';
  return ms < 1000 ? lessSecond : `${(ms / 1000).toFixed(1)}${secondUnit}`;
}

export default function App() {
  const [state, setState] = useState<PersistedState>(initialFromStorage);
  const [hydrated, setHydrated] = useState(false);
  const [page, setPage] = useState<Page>(() => pageFromHash(window.location.hash));
  const [session, setSession] = useState<RuntimeSession | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionSummary | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<(typeof SESSION_DURATIONS)[number]>(5);
  const [mode, setMode] = useState<PracticeMode>('practice');
  const [input, setInput] = useState<InputMode>('piano');
  const [clefs, setClefs] = useState<Clef[]>(['treble', 'bass']);
  const [keyboardWidth, setKeyboardWidth] = useState(0);
  const keyboardMeasureRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef(state.notes);
  const advanceTimeoutRef = useRef<number | null>(null);
  const t = useTranslation();

  useEffect(() => {
    notesRef.current = state.notes;
  }, [state.notes]);

  useEffect(() => {
    const onLocationChange = () => setPage(pageFromHash(window.location.hash));
    window.addEventListener('hashchange', onLocationChange);
    window.addEventListener('popstate', onLocationChange);
    return () => {
      window.removeEventListener('hashchange', onLocationChange);
      window.removeEventListener('popstate', onLocationChange);
    };
  }, []);

  useEffect(() => {
    void loadPersistedState().then((saved) => {
      if (saved) setState(saved);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    activateLocale(state.settings.locale);
    document.documentElement.lang = state.settings.locale;
    document.title =
      state.settings.locale === 'ru'
        ? 'Nota — Распознавание нот'
        : 'Nota — Musical note recognition';
    if (state.settings.theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.dataset.theme = state.settings.theme;
      document.documentElement.classList.toggle('dark', state.settings.theme === 'dark');
    }
  }, [state.settings.locale, state.settings.theme]);

  useEffect(() => {
    if (!hydrated) return;
    void savePersistedState(state);
  }, [state, hydrated]);

  const sessionExists = session !== null;
  useEffect(() => {
    const update = () =>
      setKeyboardWidth(keyboardMeasureRef.current?.clientWidth ?? window.innerWidth - 32);
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (keyboardMeasureRef.current && observer) observer.observe(keyboardMeasureRef.current);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [page, sessionExists]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  }, []);

  const navigate = useCallback((next: Page) => {
    window.history.replaceState(null, '', `#${next}`);
    setPage(next);
  }, []);

  const completeSession = useCallback((runtime: RuntimeSession) => {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    const successfulTimes = runtime.outcomes
      .filter((outcome) => outcome.result === 'correct' && outcome.elapsedMs !== null)
      .map((outcome) => outcome.elapsedMs as number);
    const newRecognized = runtime.outcomes
      .filter(
        (outcome) =>
          outcome.stateBefore !== 'recognized' &&
          outcome.stateBefore !== 'fluent' &&
          outcome.stateAfter === 'recognized',
      )
      .map((outcome) => outcome.itemId);
    const newFluent = runtime.outcomes
      .filter((outcome) => outcome.stateBefore !== 'fluent' && outcome.stateAfter === 'fluent')
      .map((outcome) => outcome.itemId);
    const sessionNoteIds = new Set(runtime.outcomes.map((outcome) => outcome.itemId));
    const weakest = weakestNotes(
      [...sessionNoteIds]
        .map((id) => notesRef.current[id])
        .filter((note): note is NoteStats => Boolean(note)),
      3,
    ).map((note) => note.itemId);
    const summary: SessionSummary = {
      id: runtime.id,
      startedAt: runtime.startedAt,
      durationSeconds: runtime.durationSeconds,
      mode: runtime.mode,
      attempts: runtime.outcomes.length,
      correct: runtime.outcomes.filter((outcome) => outcome.result === 'correct').length,
      timeouts: runtime.outcomes.filter((outcome) => outcome.result === 'timeout').length,
      medianResponseMs: median(successfulTimes),
      practiceSeconds: Math.min(
        runtime.durationSeconds,
        Math.round((Date.now() - runtime.startedAt) / 1000),
      ),
      newRecognized: [...new Set(newRecognized)],
      newFluent: [...new Set(newFluent)],
      weakestItemIds: weakest,
    };
    setState((current) => ({
      ...current,
      sessions: [summary, ...current.sessions].slice(0, 100),
    }));
    setSessionResult(summary);
    setSession(null);
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!session || session.paused) return;
    const timer = window.setInterval(() => {
      if (Date.now() - session.startedAt >= session.durationSeconds * 1000)
        completeSession(session);
    }, 250);
    return () => window.clearInterval(timer);
  }, [session, completeSession]);

  const startSession = useCallback(() => {
    const pointer = window.matchMedia?.('(pointer: coarse)').matches ? 'coarse' : 'fine';
    const available = unlockedItems(state.notes, clefs);
    if (available.length === 0) return;
    const firstAvailable = pickNext(available, state.notes, [], [], 1);
    const plan = planKeyboard(
      keyboardWidth || window.innerWidth - 32,
      pointer,
      available,
      firstAvailable.pitch.midi,
    );
    const candidates =
      input === 'names'
        ? available
        : plan.candidates.length > 0
          ? plan.candidates
          : available.slice(0, 1);
    if (candidates.length === 0) return;
    const first = candidates.some((item) => item.id === firstAvailable.id)
      ? firstAvailable
      : pickNext(candidates, state.notes, []);
    const now = Date.now();
    setSession({
      id: `session-${now}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt: now,
      durationSeconds: durationMinutes * 60,
      mode,
      input,
      clefs,
      candidates,
      keyboardWindow: plan.window,
      current: first,
      currentStartedAt: now,
      deadlineMs: adaptiveDeadlineMs(state.notes[first.id] ?? emptyNoteStats(first), mode),
      questionNumber: 1,
      recentItemIds: [first.id],
      outcomes: [],
      deferredQueue: [],
      paused: false,
      pausedAt: null,
    });
    setFeedback(null);
    setSessionResult(null);
  }, [clefs, durationMinutes, input, keyboardWidth, mode, state.notes]);

  const advance = useCallback((runtime: RuntimeSession) => {
    const nextQuestion = runtime.questionNumber + 1;
    const next = pickNext(
      runtime.candidates,
      notesRef.current,
      runtime.recentItemIds,
      runtime.deferredQueue,
      nextQuestion,
    );
    setSession({
      ...runtime,
      current: next,
      deferredQueue: runtime.deferredQueue.filter((entry) => entry.item.id !== next.id),
      currentStartedAt: Date.now(),
      deadlineMs: adaptiveDeadlineMs(
        notesRef.current[next.id] ?? emptyNoteStats(next),
        runtime.mode,
      ),
      questionNumber: nextQuestion,
      recentItemIds: [...runtime.recentItemIds, next.id].slice(-5),
    });
    setFeedback(null);
  }, []);

  const judge = useCallback(
    (answer: NormalizedAnswer | undefined, resultOverride?: AnswerResult) => {
      if (!session || session.paused || feedback) return;
      const elapsedMs =
        resultOverride === 'timeout' ? null : Math.max(0, Date.now() - session.currentStartedAt);
      const correct = answer
        ? session.input === 'names'
          ? answer.midi % 12 === session.current.pitch.midi % 12
          : answer.midi === session.current.pitch.midi
        : false;
      const result: AnswerResult = resultOverride ?? (correct ? 'correct' : 'incorrect');
      const previous = notesRef.current[session.current.id] ?? emptyNoteStats(session.current);
      const nextStats = recordOutcome(previous, {
        result,
        elapsedMs,
        mode: session.mode,
        input: session.input,
        sessionId: session.id,
      });
      setState((current) => ({
        ...current,
        notes: { ...current.notes, [session.current.id]: nextStats },
      }));
      const outcome: RuntimeOutcome = {
        sessionId: session.id,
        result,
        elapsedMs,
        mode: session.mode,
        input: session.input,
        at: Date.now(),
        itemId: session.current.id,
        stateBefore: previous.state,
        stateAfter: nextStats.state,
      };
      const deferredQueue =
        result === 'correct'
          ? session.deferredQueue
          : requeueAfterWrong(session.deferredQueue, session.current, session.questionNumber, 3);
      const runtime = {
        ...session,
        outcomes: [...session.outcomes, outcome],
        deferredQueue,
      };
      setSession(runtime);
      setFeedback({ result, item: session.current, elapsedMs, answer });
      advanceTimeoutRef.current = window.setTimeout(
        () => {
          advanceTimeoutRef.current = null;
          advance(runtime);
        },
        result === 'correct' ? 280 : CORRECTION_DELAY,
      );
    },
    [advance, feedback, session],
  );

  useEffect(() => {
    if (!session || session.paused || feedback) return;
    if (session.deadlineMs === null) return;
    const remaining = deadlineRemainingMs(session.currentStartedAt, Date.now(), session.deadlineMs);
    const timeout = window.setTimeout(() => judge(undefined, 'timeout'), remaining);
    return () => window.clearTimeout(timeout);
  }, [feedback, judge, session]);

  const finish = useCallback(() => {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (session) completeSession(session);
  }, [completeSession, session]);

  const togglePause = () =>
    setSession((current) => {
      if (!current) return current;
      if (!current.paused) return { ...current, paused: true, pausedAt: Date.now() };
      const pausedFor = current.pausedAt === null ? 0 : Math.max(0, Date.now() - current.pausedAt);
      return {
        ...current,
        paused: false,
        pausedAt: null,
        startedAt: current.startedAt + pausedFor,
        currentStartedAt: current.currentStartedAt + pausedFor,
      };
    });

  const answer = (value: NormalizedAnswer) => judge(value);

  if (!hydrated)
    return (
      <div className="app-loading" aria-label={t('app.loading', 'Loading Nota')}>
        <span className="brand-mark">
          <Icon name="note" />
        </span>
      </div>
    );
  if (!state.settings.hasCompletedOnboarding) {
    return (
      <I18nProvider i18n={i18n}>
        <Onboarding
          settings={state.settings}
          onChange={updateSettings}
          onComplete={() => updateSettings({ hasCompletedOnboarding: true })}
        />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider i18n={i18n}>
      <div className="app-shell">
        <Header page={page} navigate={navigate} />
        <main className="main-content">
          {page === 'train' && (
            <TrainPage
              session={session}
              feedback={feedback}
              result={sessionResult}
              mode={mode}
              input={input}
              clefs={clefs}
              durationMinutes={durationMinutes}
              keyboardMeasureRef={keyboardMeasureRef}
              onModeChange={setMode}
              onInputChange={setInput}
              onClefsChange={setClefs}
              onDurationChange={setDurationMinutes}
              onStart={startSession}
              onAnswer={answer}
              onPause={togglePause}
              onFinish={finish}
              onDismissResult={() => setSessionResult(null)}
              state={state}
              navigate={navigate}
            />
          )}
          {page === 'progress' && <ProgressPage state={state} />}
          {page === 'settings' && (
            <SettingsPage settings={state.settings} onChange={updateSettings} navigate={navigate} />
          )}
          {page === 'research' && <ResearchPage navigate={navigate} />}
        </main>
        <OfflineStatus />
        <MobileNav page={page} navigate={navigate} />
      </div>
    </I18nProvider>
  );
}

function Onboarding({
  settings,
  onChange,
  onComplete,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onComplete: () => void;
}) {
  const t = useTranslation();
  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="brand lockup">
          <span className="brand-mark">
            <Icon name="note" size={22} />
          </span>
          <span>Nota</span>
        </div>
        <p className="eyebrow">{t('onboarding.eyebrow', 'A calm practice for your eyes')}</p>
        <h1>{t('onboarding.title', 'Don’t count. Recognize.')}</h1>
        <p className="lead">
          {t(
            'onboarding.body',
            'Build a direct connection between the note on the staff and its place on the piano. Start with a few landmarks, then let accuracy become speed.',
          )}
        </p>
        <fieldset className="onboarding-choice">
          <legend>{t('onboarding.naming', 'How should note names appear?')}</legend>
          <NamingChoice
            selected={settings.naming === 'letters'}
            onClick={() => onChange({ naming: 'letters' })}
            title={t('onboarding.letters', 'Letters')}
            example={t('onboarding.lettersExample', 'C · D · E · F · G · A · B')}
          />
          <NamingChoice
            selected={settings.naming === 'solfege'}
            onClick={() => onChange({ naming: 'solfege' })}
            title={t('onboarding.solfege', 'Fixed solfège')}
            example={t('onboarding.solfegeExample', 'Do · Re · Mi · Fa · Sol · La · Si')}
          />
        </fieldset>
        <button className="button button-primary button-large" type="button" onClick={onComplete}>
          {t('onboarding.start', 'Start training')} <Icon name="arrow" size={18} />
        </button>
        <p className="fine-print">
          {t(
            'settings.about',
            'Nota is a small, local-first tool. Your progress stays on this device.',
          )}
        </p>
      </div>
    </div>
  );
}

function NamingChoice({
  selected,
  onClick,
  title,
  example,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  example: string;
}) {
  return (
    <button
      type="button"
      className={`choice-card ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="choice-radio" />{' '}
      <span>
        <strong>{title}</strong>
        <small>{example}</small>
      </span>
    </button>
  );
}

function Header({ page, navigate }: { page: Page; navigate: (page: Page) => void }) {
  const t = useTranslation();
  return (
    <header className="top-bar">
      <button
        className="brand brand-button"
        type="button"
        onClick={() => navigate('train')}
        aria-label={t('app.name', 'Nota')}
      >
        <span className="brand-mark">
          <Icon name="note" size={19} />
        </span>
        <span>Nota</span>
      </button>
      <nav className="desktop-nav" aria-label={t('aria.primaryNav', 'Primary navigation')}>
        <NavButton
          active={page === 'train'}
          icon="play"
          label={t('nav.train', 'Train')}
          onClick={() => navigate('train')}
        />
        <NavButton
          active={page === 'progress'}
          icon="chart"
          label={t('nav.progress', 'Progress')}
          onClick={() => navigate('progress')}
        />
        <NavButton
          active={page === 'settings' || page === 'research'}
          icon="settings"
          label={t('nav.settings', 'Settings')}
          onClick={() => navigate('settings')}
        />
      </nav>
      <div className="top-spacer" />
      <span className="domain-label">nota.balakin.io</span>
    </header>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: 'play' | 'chart' | 'settings';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-button ${active ? 'active' : ''}`}
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <Icon name={icon} size={17} />
      <span>{label}</span>
    </button>
  );
}

function MobileNav({ page, navigate }: { page: Page; navigate: (page: Page) => void }) {
  const t = useTranslation();
  return (
    <nav className="mobile-nav" aria-label={t('aria.primaryNav', 'Primary navigation')}>
      <NavButton
        active={page === 'train'}
        icon="play"
        label={t('nav.train', 'Train')}
        onClick={() => navigate('train')}
      />
      <NavButton
        active={page === 'progress'}
        icon="chart"
        label={t('nav.progress', 'Progress')}
        onClick={() => navigate('progress')}
      />
      <NavButton
        active={page === 'settings' || page === 'research'}
        icon="settings"
        label={t('nav.settings', 'Settings')}
        onClick={() => navigate('settings')}
      />
    </nav>
  );
}

function TrainPage(props: {
  session: RuntimeSession | null;
  feedback: Feedback | null;
  result: SessionSummary | null;
  mode: PracticeMode;
  input: InputMode;
  clefs: Clef[];
  durationMinutes: number;
  keyboardMeasureRef: React.RefObject<HTMLDivElement | null>;
  onModeChange: (value: PracticeMode) => void;
  onInputChange: (value: InputMode) => void;
  onClefsChange: (value: Clef[]) => void;
  onDurationChange: (value: 2 | 5 | 10) => void;
  onStart: () => void;
  onAnswer: (answer: NormalizedAnswer) => void;
  onPause: () => void;
  onFinish: () => void;
  onDismissResult: () => void;
  state: PersistedState;
  navigate: (page: Page) => void;
}) {
  const t = useTranslation();
  if (props.result)
    return <ResultPage result={props.result} state={props.state} onDone={props.onDismissResult} />;
  if (props.session) return <PracticeSession {...props} session={props.session} />;
  return (
    <div className="page train-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('app.tagline', 'Train instant musical note recognition.')}</p>
          <h1>{t('train.title', 'Recognition practice')}</h1>
          <p className="subheading">
            {t('train.subtitle', 'Look at the staff, then answer without counting.')}
          </p>
        </div>
        <span className="session-note">
          <Icon name="note" size={17} /> {t('train.ready', 'Ready when you are.')}
        </span>
      </div>
      <div className="start-grid">
        <section ref={props.keyboardMeasureRef} className="setup-panel">
          <ModePicker mode={props.mode} onChange={props.onModeChange} />
          <TogglePicker
            label={t('train.input', 'Answer with')}
            options={
              [
                ['piano', t('train.piano', 'Piano')],
                ['names', t('train.names', 'Note names')],
              ] as const
            }
            value={props.input}
            onChange={props.onInputChange}
          />
          <TogglePicker
            label={t('train.clefs', 'Clefs')}
            options={
              [
                ['both', t('train.bothClefs', 'Treble + Bass')],
                ['treble', t('train.treble', 'Treble')],
                ['bass', t('train.bass', 'Bass')],
              ] as const
            }
            value={props.clefs.length === 2 ? 'both' : props.clefs[0]}
            onChange={(value) =>
              props.onClefsChange(value === 'both' ? ['treble', 'bass'] : [value])
            }
          />
          <div className="setting-row">
            <span className="setting-label">{t('train.duration', 'Session length')}</span>
            <div className="segmented">
              {SESSION_DURATIONS.map((minutes) => (
                <button
                  type="button"
                  key={minutes}
                  className={props.durationMinutes === minutes ? 'selected' : ''}
                  aria-pressed={props.durationMinutes === minutes}
                  onClick={() => props.onDurationChange(minutes)}
                >
                  {t('train.minutes', '{value} min', { value: minutes })}
                </button>
              ))}
            </div>
          </div>
          <button
            className="button button-primary button-large start-button"
            type="button"
            onClick={props.onStart}
          >
            <Icon name="play" size={18} /> {t('train.continue', 'Continue training')}
          </button>
        </section>
        <section className="principle-panel">
          <span className="principle-line" />
          <p className="eyebrow">{t('train.look', 'Look → recognize → answer')}</p>
          <h2>{t('onboarding.title', 'Don’t count. Recognize.')}</h2>
          <p>
            {t(
              'research.visualBody',
              'Fluent note reading is a visual-perceptual skill. Targeted practice can focus on recognizing a note’s whole pattern instead of consciously calculating its position.',
            )}
          </p>
          <div className="principle-stats">
            <span>
              <strong>
                {t('time.seconds', '{value}s', {
                  value: props.state.settings.locale === 'ru' ? '2,0' : '2.0',
                })}
              </strong>
              <small>{t('train.speed', 'Speed')}</small>
            </span>
            <span>
              <strong>7</strong>
              <small>{t('progress.noteMap', 'Note map')}</small>
            </span>
            <span>
              <strong>∞</strong>
              <small>{t('offline', 'Local')}</small>
            </span>
          </div>
        </section>
      </div>
      <p className="local-note">
        <Icon name="check" size={16} />{' '}
        {t(
          'settings.about',
          'Nota is a small, local-first tool. Your progress stays on this device.',
        )}
      </p>
    </div>
  );
}

function ModePicker({
  mode,
  onChange,
}: {
  mode: PracticeMode;
  onChange: (mode: PracticeMode) => void;
}) {
  const t = useTranslation();
  return (
    <div className="setting-row">
      <span className="setting-label">{t('train.mode', 'Training mode')}</span>
      <div className="mode-grid">
        <button
          type="button"
          className={mode === 'practice' ? 'selected' : ''}
          aria-pressed={mode === 'practice'}
          onClick={() => onChange('practice')}
        >
          <strong>{t('train.practice', 'Practice')}</strong>
          <small>{t('train.practiceDescription', 'Generous time while you build accuracy')}</small>
        </button>
        <button
          type="button"
          className={mode === 'speed' ? 'selected' : ''}
          aria-pressed={mode === 'speed'}
          onClick={() => onChange('speed')}
        >
          <strong>{t('train.speed', 'Speed')}</strong>
          <small>{t('train.speedDescription', '2 seconds per note · piano labels hidden')}</small>
        </button>
      </div>
    </div>
  );
}

function TogglePicker<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <div className="segmented">
        {options.map(([key, text]) => (
          <button
            type="button"
            key={key}
            className={key === value ? 'selected' : ''}
            aria-pressed={key === value}
            onClick={() => onChange(key)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function PracticeSession({
  session,
  feedback,
  mode,
  input,
  state,
  keyboardMeasureRef,
  onAnswer,
  onPause,
  onFinish,
}: {
  session: RuntimeSession;
  feedback: Feedback | null;
  mode: PracticeMode;
  input: InputMode;
  state: PersistedState;
  keyboardMeasureRef: React.RefObject<HTMLDivElement | null>;
  onAnswer: (answer: NormalizedAnswer) => void;
  onPause: () => void;
  onFinish: () => void;
}) {
  const t = useTranslation();
  const [now, setNow] = useState(Date.now());
  const answerDisabled = Boolean(feedback) || session.paused;
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (input !== 'piano') return;
    const whiteKeyMap: Record<string, number> = { a: 0, s: 1, d: 2, f: 3, g: 4, h: 5, j: 6 };
    const onKeyDown = (event: KeyboardEvent) => {
      if (answerDisabled || event.metaKey || event.ctrlKey || event.altKey) return;
      const offset = whiteKeyMap[event.key.toLowerCase()];
      const target = offset === undefined ? undefined : session.keyboardWindow.whiteKeys[offset];
      if (!target) return;
      event.preventDefault();
      onAnswer(keyboardAnswer(target.midi));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answerDisabled, input, onAnswer, session.keyboardWindow.whiteKeys]);
  const timingNow = session.paused && session.pausedAt !== null ? session.pausedAt : now;
  const elapsed = Math.min(
    session.durationSeconds,
    Math.floor((timingNow - session.startedAt) / 1000),
  );
  const questionElapsed = Math.min(
    session.deadlineMs ?? SPEED_DEADLINE_MS,
    timingNow - session.currentStartedAt,
  );
  const timerProgress = session.deadlineMs
    ? Math.max(0, 1 - questionElapsed / session.deadlineMs)
    : null;
  const currentStats = state.notes[session.current.id];
  const isIntroduction =
    !feedback && mode === 'practice' && (currentStats?.totalAttempts ?? 0) === 0;
  const currentName = displayNoteName(
    session.current.pitch,
    state.settings.naming,
    state.settings.locale,
  );
  return (
    <div className="practice-page">
      <div className="practice-toolbar">
        <span className="practice-counter">
          {t('train.question', 'Question {current} of {total}', {
            current: session.questionNumber,
            total: '∞',
          })}
        </span>
        <span className="practice-mode-label">
          {mode === 'speed' ? t('train.speed', 'Speed') : t('train.practice', 'Practice')} ·{' '}
          {formatDuration(elapsed)}
        </span>
        <div className="toolbar-actions">
          <button className="quiet-button" type="button" onClick={onPause}>
            <Icon name={session.paused ? 'play' : 'clock'} size={16} />{' '}
            {session.paused ? t('train.resume', 'Resume') : t('train.pause', 'Pause')}
          </button>
          <button className="quiet-button finish-button" type="button" onClick={onFinish}>
            {t('train.finish', 'Finish session')}
          </button>
        </div>
      </div>
      <div className="practice-stage">
        <div
          className={`timing-line ${session.deadlineMs ? 'timed' : ''} ${feedback ? `feedback-${feedback.result}` : ''}`}
          style={timerProgress === null ? undefined : { transform: `scaleX(${timerProgress})` }}
        />
        <div
          className={`staff-stage ${feedback ? `is-${feedback.result}` : ''} ${session.paused ? 'is-paused' : ''}`}
        >
          {session.paused ? (
            <div className="paused-copy">
              <Icon name="clock" size={28} />
              <strong>{t('train.pause', 'Pause')}</strong>
            </div>
          ) : feedback?.result === 'timeout' ? (
            <div className="staff-cleared" aria-label={t('train.timeout', 'Time')}>
              —
            </div>
          ) : (
            <NotationStaff
              pitch={session.current.pitch}
              clef={session.current.clef}
              locale={state.settings.locale}
            />
          )}
        </div>
        {feedback ? (
          <FeedbackBanner
            feedback={feedback}
            naming={state.settings.naming}
            locale={state.settings.locale}
          />
        ) : (
          <p className={`answer-prompt ${isIntroduction ? 'intro-prompt' : ''}`}>
            {isIntroduction
              ? t('train.intro', 'New note: {note} · press the highlighted key to meet it.', {
                  note: currentName,
                })
              : t('train.keyHint', 'Use the piano key that matches the note.')}
          </p>
        )}
        <div ref={keyboardMeasureRef} className="answer-area">
          {input === 'piano' ? (
            <Piano
              window={session.keyboardWindow}
              naming={state.settings.naming}
              locale={state.settings.locale}
              showLabels={mode !== 'speed' || isIntroduction}
              highlightMidi={
                feedback?.item.pitch.midi ??
                (isIntroduction ? session.current.pitch.midi : undefined)
              }
              disabled={answerDisabled}
              onAnswer={onAnswer}
            />
          ) : (
            <NoteNamePad
              naming={state.settings.naming}
              locale={state.settings.locale}
              disabled={answerDisabled}
              onAnswer={onAnswer}
            />
          )}
        </div>
        {mode === 'speed' && !feedback ? (
          <span className="speed-caption">
            <Icon name="clock" size={14} />{' '}
            {input === 'piano' ? t('train.noLabels', 'Unlabeled piano') : t('train.speed', 'Speed')}{' '}
            ·{' '}
            {t('time.seconds', '{value}s', {
              value: state.settings.locale === 'ru' ? '2,0' : '2.0',
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function FeedbackBanner({
  feedback,
  naming,
  locale,
}: {
  feedback: Feedback;
  naming: AppSettings['naming'];
  locale: Locale;
}) {
  const t = useTranslation();
  const note = displayNoteName(feedback.item.pitch, naming, locale);
  const title =
    feedback.result === 'correct'
      ? t('train.correct', 'Correct')
      : feedback.result === 'timeout'
        ? t('train.timeout', 'Time')
        : t('train.wrong', 'Not quite');
  const detail =
    feedback.result === 'correct'
      ? formatResponse(
          feedback.elapsedMs,
          t('time.lessSecond', '< 1s'),
          locale === 'ru' ? ' с' : 's',
        )
      : `${t('train.correctAnswer', 'Correct answer')}: ${note}`;
  return (
    <div className={`feedback-banner ${feedback.result}`} role="status">
      <span className="feedback-icon">
        <Icon name={feedback.result === 'correct' ? 'check' : 'clock'} size={18} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

function ResultPage({
  result,
  state,
  onDone,
}: {
  result: SessionSummary;
  state: PersistedState;
  onDone: () => void;
}) {
  const t = useTranslation();
  const items = allRecognitionItems();
  const names = (ids: string[]) =>
    ids.map((id) => {
      const item = items.find((candidate) => candidate.id === id);
      return item ? displayNoteName(item.pitch, state.settings.naming, state.settings.locale) : id;
    });
  return (
    <div className="page result-page">
      <div className="result-header">
        <span className="result-icon">
          <Icon name="check" size={24} />
        </span>
        <div>
          <p className="eyebrow">{t('result.summary', 'A small, useful block of practice.')}</p>
          <h1>{t('result.title', 'Session complete')}</h1>
        </div>
      </div>
      <div className="result-metrics">
        <Metric label={t('result.attempted', 'Notes attempted')} value={result.attempts} />
        <Metric
          label={t('result.accuracy', 'Accuracy')}
          value={`${result.attempts ? Math.round((result.correct / result.attempts) * 100) : 0}%`}
        />
        <Metric
          label={t('result.median', 'Median response')}
          value={formatResponse(
            result.medianResponseMs,
            t('time.lessSecond', '< 1s'),
            state.settings.locale === 'ru' ? ' с' : 's',
          )}
        />
        <Metric label={t('result.timeouts', 'Timeouts')} value={result.timeouts} />
      </div>
      <div className="result-columns">
        <section className="surface result-detail">
          <h2>{t('result.newProgress', 'New progress')}</h2>
          {result.newRecognized.length + result.newFluent.length > 0 ? (
            <div className="result-tags">
              {[...names(result.newRecognized), ...names(result.newFluent)].map((name) => (
                <span className="tag" key={name}>
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted-copy">
              {t('result.noNew', 'Keep going — your next recognition is forming.')}
            </p>
          )}
          <h2>{t('result.weakest', 'Worth another look')}</h2>
          {result.weakestItemIds.length > 0 ? (
            <div className="weak-list">
              {names(result.weakestItemIds).map((name) => (
                <span key={name}>
                  <Icon name="arrow" size={14} /> {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted-copy">
              {t('progress.noPractice', 'Your note map will fill in as you practice.')}
            </p>
          )}
        </section>
        <section className="surface result-detail">
          <h2>{t('result.practiceTime', 'Practice time')}</h2>
          <strong className="big-number">{formatDuration(result.practiceSeconds)}</strong>
          <p className="muted-copy">
            {result.mode === 'speed'
              ? t('train.speedDescription', '2 seconds per note · piano labels hidden')
              : t('train.practiceDescription', 'Generous time while you build accuracy')}
          </p>
          <button className="button button-primary" type="button" onClick={onDone}>
            {t('result.done', 'Back to training')} <Icon name="arrow" size={17} />
          </button>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressPage({ state }: { state: PersistedState }) {
  const t = useTranslation();
  const items = allRecognitionItems();
  const notes = items.map((item) => state.notes[item.id] ?? emptyNoteStats(item));
  const practiced = notes.filter((note) => note.totalAttempts > 0);
  const fluent = notes.filter((note) => note.state === 'fluent').length;
  const recognized = notes.filter(
    (note) => note.state === 'recognized' || note.state === 'fluent',
  ).length;
  const totalAttempts = notes.reduce((sum, note) => sum + note.totalAttempts, 0);
  const totalCorrect = notes.reduce((sum, note) => sum + note.correctAttempts, 0);
  const responseTimes = notes.flatMap((note) => note.responseTimes);
  const totalSeconds = state.sessions.reduce((sum, session) => sum + session.practiceSeconds, 0);
  return (
    <div className="page progress-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t('progress.subtitle', 'Recognition gets useful when it is fast and retained.')}
          </p>
          <h1>{t('progress.title', 'Your progress')}</h1>
        </div>
      </div>
      <section className="metric-grid">
        <Metric label={t('progress.fluent', 'Fluent notes')} value={fluent} />
        <Metric label={t('progress.recognized', 'Recognized notes')} value={recognized} />
        <Metric
          label={t('progress.accuracy', 'Accuracy')}
          value={`${totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0}%`}
        />
        <Metric
          label={t('progress.median', 'Median response')}
          value={formatResponse(
            median(responseTimes),
            t('time.lessSecond', '< 1s'),
            state.settings.locale === 'ru' ? ' с' : 's',
          )}
        />
        <Metric
          label={t('progress.totalTime', 'Training time')}
          value={formatDuration(totalSeconds)}
        />
      </section>
      <div className="progress-layout">
        <section className="surface">
          <SectionTitle title={t('progress.byClef', 'By clef')} />
          <div className="clef-progress">
            <ClefProgress clef="treble" notes={notes.filter((note) => note.clef === 'treble')} />
            <ClefProgress clef="bass" notes={notes.filter((note) => note.clef === 'bass')} />
          </div>
        </section>
        <section className="surface">
          <SectionTitle title={t('progress.weakest', 'Weakest notes')} />
          <WeakNotes notes={weakestNotes(practiced, 4)} state={state} />
        </section>
      </div>
      <section className="surface note-map-section">
        <SectionTitle title={t('progress.noteMap', 'Note mastery map')} />
        <p className="muted-copy">
          {t('progress.noPractice', 'Your note map will fill in as you practice.')}
        </p>
        <div className="note-map">
          {notes.map((note) => (
            <NoteMapItem key={note.itemId} note={note} state={state} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="section-title">{title}</h2>;
}
function ClefProgress({ clef, notes }: { clef: Clef; notes: NoteStats[] }) {
  const t = useTranslation();
  const practiced = notes.filter((note) => note.totalAttempts > 0);
  const correct = notes.reduce((sum, note) => sum + note.correctAttempts, 0);
  const attempts = notes.reduce((sum, note) => sum + note.totalAttempts, 0);
  return (
    <div className="clef-block">
      <div className="clef-title">
        <span className={`clef-symbol ${clef}`}>{clef === 'treble' ? '𝄞' : '𝄢'}</span>
        <strong>{t(`clef.${clef}`, CLEF_LABELS[clef].en)}</strong>
        <span>
          {practiced.length}/{notes.length}
        </span>
      </div>
      <div className="bar-track">
        <span style={{ width: `${notes.length ? (practiced.length / notes.length) * 100 : 0}%` }} />
      </div>
      <small>
        {attempts
          ? `${Math.round((correct / attempts) * 100)}% ${t('progress.accuracy', 'accuracy')}`
          : t('state.new', 'New')}
      </small>
    </div>
  );
}
function NoteMapItem({ note, state }: { note: NoteStats; state: PersistedState }) {
  const t = useTranslation();
  const item = allRecognitionItems().find((candidate) => candidate.id === note.itemId);
  if (!item) return null;
  const name = displayNoteName(item.pitch, state.settings.naming, state.settings.locale);
  return (
    <div className={`note-map-item state-${note.state}`}>
      <span className={`mini-clef ${item.clef}`}>{item.clef === 'treble' ? '𝄞' : '𝄢'}</span>
      <span className="note-map-name">
        <strong>
          {name}
          {state.settings.naming === 'letters' ? item.pitch.octave : ''}
        </strong>
        <small>{t(`state.${note.state}`, note.state)}</small>
      </span>
      <span className="note-map-stat">
        {note.totalAttempts
          ? `${Math.round(accuracy(note) * 100)}% · ${formatResponse(medianResponseTime(note), t('time.lessSecond', '< 1s'), state.settings.locale === 'ru' ? ' с' : 's')}`
          : '—'}
      </span>
    </div>
  );
}
function WeakNotes({ notes, state }: { notes: NoteStats[]; state: PersistedState }) {
  const t = useTranslation();
  if (!notes.length)
    return (
      <p className="muted-copy">
        {t('progress.noPractice', 'Your note map will fill in as you practice.')}
      </p>
    );
  return (
    <div className="weak-list">
      {notes.map((note) => {
        const item = allRecognitionItems().find((candidate) => candidate.id === note.itemId);
        return item ? (
          <span key={note.itemId}>
            <Icon name="arrow" size={14} />{' '}
            {displayNoteName(item.pitch, state.settings.naming, state.settings.locale)}
            {item.pitch.octave} <small>{Math.round(accuracy(note) * 100)}%</small>
          </span>
        ) : null;
      })}
    </div>
  );
}

function SettingsPage({
  settings,
  onChange,
  navigate,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  navigate: (page: Page) => void;
}) {
  const t = useTranslation();
  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('settings.subtitle', 'Make Nota fit the way you learn.')}</p>
          <h1>{t('settings.title', 'Settings')}</h1>
        </div>
      </div>
      <div className="settings-list">
        <SettingSection title={t('settings.language', 'Interface language')}>
          <div
            className="segmented wide"
            role="group"
            aria-label={t('aria.language', 'Choose interface language')}
          >
            <button
              type="button"
              className={settings.locale === 'en' ? 'selected' : ''}
              aria-pressed={settings.locale === 'en'}
              onClick={() => onChange({ locale: 'en' })}
            >
              English
            </button>
            <button
              type="button"
              className={settings.locale === 'ru' ? 'selected' : ''}
              aria-pressed={settings.locale === 'ru'}
              onClick={() => onChange({ locale: 'ru' })}
            >
              Русский
            </button>
          </div>
        </SettingSection>
        <SettingSection title={t('settings.naming', 'Note naming')}>
          <div
            className="segmented wide"
            role="group"
            aria-label={t('aria.naming', 'Choose note naming system')}
          >
            <button
              type="button"
              className={settings.naming === 'letters' ? 'selected' : ''}
              aria-pressed={settings.naming === 'letters'}
              onClick={() => onChange({ naming: 'letters' })}
            >
              C D E F G A B
            </button>
            <button
              type="button"
              className={settings.naming === 'solfege' ? 'selected' : ''}
              aria-pressed={settings.naming === 'solfege'}
              onClick={() => onChange({ naming: 'solfege' })}
            >
              Do Re Mi Fa Sol La Si
            </button>
          </div>
          <p className="setting-hint">
            {t('settings.namingHint', 'This changes labels, never your progress.')}
          </p>
        </SettingSection>
        <SettingSection title={t('settings.theme', 'Appearance')}>
          <div
            className="segmented wide"
            role="group"
            aria-label={t('aria.theme', 'Choose color theme')}
          >
            <button
              type="button"
              className={settings.theme === 'system' ? 'selected' : ''}
              aria-pressed={settings.theme === 'system'}
              onClick={() => onChange({ theme: 'system' })}
            >
              {t('settings.system', 'System')}
            </button>
            <button
              type="button"
              className={settings.theme === 'light' ? 'selected' : ''}
              aria-pressed={settings.theme === 'light'}
              onClick={() => onChange({ theme: 'light' })}
            >
              {t('settings.light', 'Light')}
            </button>
            <button
              type="button"
              className={settings.theme === 'dark' ? 'selected' : ''}
              aria-pressed={settings.theme === 'dark'}
              onClick={() => onChange({ theme: 'dark' })}
            >
              {t('settings.dark', 'Dark')}
            </button>
          </div>
        </SettingSection>
        <SettingSection title={t('settings.research', 'Research behind Nota')}>
          <p className="setting-hint">
            {t(
              'settings.researchDescription',
              'Why Nota uses visual retrieval, timing, and spaced review.',
            )}
          </p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => navigate('research')}
          >
            {t('settings.openResearch', 'Read the research')} <Icon name="arrow" size={16} />
          </button>
        </SettingSection>
        <p className="about-copy">
          {t(
            'settings.about',
            'Nota is a small, local-first tool. Your progress stays on this device.',
          )}
        </p>
      </div>
    </div>
  );
}
function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface setting-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

const RESEARCH = [
  {
    key: 'visual',
    doi: '10.3389/fcogn.2025.1439439',
    authors: 'Yetta Kwailing Wong & Joy Fong Fang · 2025',
    url: 'https://doi.org/10.3389/fcogn.2025.1439439',
  },
  {
    key: 'speed',
    doi: '10.1167/16.8.15',
    authors: 'Yetta Kwailing Wong & Alan C.-N. Wong · 2016',
    url: 'https://doi.org/10.1167/16.8.15',
  },
  {
    key: 'perception',
    doi: '10.1167/19.7.8',
    authors: 'Alan C.-N. Wong et al. · 2019',
    url: 'https://doi.org/10.1167/19.7.8',
  },
  {
    key: 'spacing',
    doi: '10.1038/s44159-022-00089-1',
    authors: 'Shana K. Carpenter, Steven C. Pan & Andrew C. Butler · 2022',
    url: 'https://doi.org/10.1038/s44159-022-00089-1',
  },
] as const;
function ResearchPage({ navigate }: { navigate: (page: Page) => void }) {
  const t = useTranslation();
  return (
    <div className="page research-page">
      <button type="button" className="back-link" onClick={() => navigate('settings')}>
        <Icon name="arrow" size={16} /> {t('research.back', 'Back to settings')}
      </button>
      <div className="research-header">
        <p className="eyebrow">Nota / 01</p>
        <h1>{t('research.title', 'Research behind Nota')}</h1>
        <p className="lead">
          {t(
            'research.intro',
            'Nota is inspired by research on visual perceptual learning, musical-note recognition, retrieval practice, and spaced learning. The curriculum and thresholds are product-design hypotheses, not scientifically validated promises.',
          )}
        </p>
      </div>
      <div className="research-list">
        {RESEARCH.map((paper) => (
          <article className="surface research-card" key={paper.doi}>
            <div className="research-number">
              {String(RESEARCH.indexOf(paper) + 1).padStart(2, '0')}
            </div>
            <div>
              <h2>{t(`research.${paper.key}Title`, paper.key)}</h2>
              <p>{t(`research.${paper.key}Body`, '')}</p>
              <p className="paper-meta">
                {paper.authors}
                <br />
                <em>{paper.doi}</em>
              </p>
              <a href={paper.url} target="_blank" rel="noopener noreferrer">
                {t('research.source', 'Read the original paper')} <Icon name="arrow" size={15} />
              </a>
            </div>
          </article>
        ))}
      </div>
      <p className="research-disclaimer">
        {t(
          'research.disclaimer',
          'Nota does not claim scientific certification or guarantee a result in a particular number of hours.',
        )}
      </p>
    </div>
  );
}

function OfflineStatus() {
  const t = useTranslation();
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return (
    <div className={`offline-status ${online ? 'is-online' : ''}`} role="status">
      <span className="status-dot" />{' '}
      {online
        ? t('online', 'Back online')
        : t('offline', 'Offline — progress is saved on this device')}
    </div>
  );
}
