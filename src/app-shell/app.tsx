import { I18nProvider } from '@lingui/react';
import { useLingui } from '@lingui/react/macro';

import { useAppState } from '../app-state/use-app-state';
import { i18n } from '../i18n/i18n';
import { OnboardingPage } from '../onboarding/onboarding-page';
import { PracticePage } from '../practice/practice-page';
import { usePracticeSession } from '../practice/use-practice-session';
import { ProgressPage } from '../progress/progress-page';
import { ResearchPage } from '../research/research-page';
import { usePage } from '../router/use-page';
import { SettingsPage } from '../settings/settings-page';
import { Icon } from '../ui/icon';

import { Header } from './header';
import { OfflineStatus } from './offline-status';
import { PrimaryNav } from './primary-nav';
import { useDocumentChrome } from './use-document-chrome';

export default function App() {
  const { t } = useLingui();
  const { state, hydrated, updateSettings, recordNoteStats, appendSession } =
    useAppState();
  const { page, navigate } = usePage();
  const practice = usePracticeSession({
    notes: state.notes,
    onNoteStats: recordNoteStats,
    onSessionComplete: appendSession,
  });

  useDocumentChrome(state.settings);
  /* A running session is a focused mode: there is nowhere to navigate until it ends. */
  const inSession = practice.session !== null;

  if (!hydrated)
    return (
      <div className="app-loading" aria-label={t`Loading Nota`}>
        <span className="brand-mark">
          <Icon name="note" />
        </span>
      </div>
    );

  if (!state.settings.hasCompletedOnboarding)
    return (
      <I18nProvider i18n={i18n}>
        <OnboardingPage
          settings={state.settings}
          onChange={updateSettings}
          onComplete={() => updateSettings({ hasCompletedOnboarding: true })}
        />
      </I18nProvider>
    );

  return (
    <I18nProvider i18n={i18n}>
      <div className={`app-shell ${inSession ? 'is-session' : ''}`}>
        {inSession ? null : <Header page={page} navigate={navigate} />}
        <main className="main-content">
          {page === 'train' && (
            <PracticePage practice={practice} state={state} />
          )}
          {page === 'progress' && <ProgressPage state={state} />}
          {page === 'settings' && (
            <SettingsPage
              settings={state.settings}
              onChange={updateSettings}
              navigate={navigate}
            />
          )}
          {page === 'research' && <ResearchPage navigate={navigate} />}
        </main>
        <OfflineStatus />
        {inSession ? null : (
          <PrimaryNav page={page} navigate={navigate} className="mobile-nav" />
        )}
      </div>
    </I18nProvider>
  );
}
