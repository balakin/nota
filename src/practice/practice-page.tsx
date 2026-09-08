import type { PersistedState } from '../app-state/app-state';

import { PracticeSession } from './practice-session';
import { ResultPage } from './result-page';
import { SessionSetup } from './session-setup';
import type { PracticeSessionController } from './use-practice-session';

/** Entry point of the Train tab: setup, live session, or the session summary. A Learning
 * session runs on its own page, so this one only shows what Train itself started. */
export function PracticePage({
  practice,
  state,
}: {
  practice: PracticeSessionController;
  state: PersistedState;
}) {
  if (practice.result?.track === 'train')
    return (
      <ResultPage
        result={practice.result}
        settings={state.settings}
        onDone={practice.dismissResult}
      />
    );
  if (practice.session?.track === 'train')
    return (
      <PracticeSession
        session={practice.session}
        feedback={practice.feedback}
        settings={state.settings}
        midi={practice.midi}
        onAnswer={practice.answer}
        onPause={practice.togglePause}
        onFinish={practice.finish}
      />
    );
  return (
    <SessionSetup
      practice={practice}
      locale={state.settings.locale}
      naming={state.settings.naming}
    />
  );
}
