import type { PersistedState } from '../app-state/app-state';
import { PracticeSession } from './practice-session';
import { ResultPage } from './result-page';
import { SessionSetup } from './session-setup';
import type { PracticeSessionController } from './use-practice-session';

/** Entry point of the practice module: setup, live session, or the session summary. */
export function PracticePage({
  practice,
  state,
}: {
  practice: PracticeSessionController;
  state: PersistedState;
}) {
  if (practice.result)
    return (
      <ResultPage
        result={practice.result}
        settings={state.settings}
        onDone={practice.dismissResult}
      />
    );
  if (practice.session)
    return (
      <PracticeSession
        session={practice.session}
        feedback={practice.feedback}
        settings={state.settings}
        notes={state.notes}
        onAnswer={practice.answer}
        onPause={practice.togglePause}
        onFinish={practice.finish}
      />
    );
  return <SessionSetup practice={practice} locale={state.settings.locale} />;
}
