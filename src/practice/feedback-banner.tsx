import { useLingui } from '@lingui/react/macro';

import type { AppSettings, Locale } from '../app-state/app-state';
import { displayNoteName } from '../music/music';
import { Icon } from '../ui/icon';
import { formatResponse } from '../utils/format';

import type { Feedback } from './session';

export function FeedbackBanner({
  feedback,
  naming,
  locale,
}: {
  feedback: Feedback;
  naming: AppSettings['naming'];
  locale: Locale;
}) {
  const { t } = useLingui();
  const note = displayNoteName(feedback.item.pitch, naming, locale);
  const title =
    feedback.result === 'correct'
      ? t`Correct`
      : feedback.result === 'timeout'
        ? t`Time`
        : t`Not quite`;
  const detail =
    feedback.result === 'correct'
      ? formatResponse(
          feedback.elapsedMs,
          t`< 1s`,
          locale === 'ru' ? ' с' : 's',
        )
      : `${t`Correct answer`}: ${note}`;
  return (
    <div className={`feedback-banner ${feedback.result}`} role="status">
      <span className="feedback-icon">
        <Icon
          name={feedback.result === 'correct' ? 'check' : 'clock'}
          size={18}
        />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}
