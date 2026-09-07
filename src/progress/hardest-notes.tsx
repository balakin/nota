import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';

import type { AppSettings } from '../app-state/app-state';
import { findRecognitionItem } from '../music/recognition-items';
import { accuracyOf, quantileMs, type Totals } from '../training/rollups';
import type { NoteStats } from '../training/training';
import { noteWeight, type NoteEvidence } from '../training/weights';
import { NoteLabel } from '../ui/note-label';
import { formatResponse } from '../utils/format';

const REASONS = {
  unseen: msg`barely seen`,
  timeouts: msg`running out of time`,
  wrong: msg`often wrong`,
  slow: msg`slow to come`,
  stale: msg`not seen lately`,
};

/**
 * Names whichever signal contributes most to this note's weight, rather than testing
 * fixed thresholds — so the column still explains the ranking when every note is close.
 */
function reasonFor(evidence: NoteEvidence, now: number): keyof typeof REASONS {
  const accuracy =
    evidence.attempts === 0 ? 0 : evidence.correct / evidence.attempts;
  const terms: [keyof typeof REASONS, number][] = [
    ['unseen', evidence.attempts < 8 ? 1.6 : 1],
    ['timeouts', 1 + (evidence.timeouts / Math.max(1, evidence.attempts)) * 3],
    ['wrong', 1 + 3 * Math.pow(1 - accuracy, 1.5)],
    ['slow', (evidence.medianMs ?? 0) / 2000],
    [
      'stale',
      evidence.lastPracticedAt === null
        ? 1
        : 0.35 + ((now - evidence.lastPracticedAt) / 86_400_000) * 0.5,
    ],
  ];
  return terms.reduce((best, term) => (term[1] > best[1] ? term : best))[0];
}

export function HardestNotes({
  notes,
  byItem,
  settings,
  now,
}: {
  notes: NoteStats[];
  byItem: Record<string, Totals>;
  settings: AppSettings;
  now: number;
}) {
  const { t } = useLingui();
  const ranked = notes
    .map((stats) => {
      const totals = byItem[stats.itemId];
      const evidence: NoteEvidence = {
        itemId: stats.itemId,
        attempts: totals?.attempts ?? 0,
        correct: totals?.correct ?? 0,
        timeouts: totals?.timeouts ?? 0,
        medianMs: totals ? quantileMs(totals) : null,
        lastPracticedAt: stats.lastPracticedAt,
        state: stats.state,
      };
      return { evidence, totals, weight: noteWeight(evidence, now) };
    })
    .filter((row) => row.evidence.attempts > 0)
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 6);

  if (!ranked.length)
    return (
      <p className="muted-copy">{t`Nothing practiced in this range yet, so there is nothing to rank.`}</p>
    );

  return (
    <ul className="hardest-list">
      {ranked.map(({ evidence, totals }) => {
        const item = findRecognitionItem(evidence.itemId);
        if (!item || !totals) return null;
        const percent = Math.round(accuracyOf(totals) * 100);
        return (
          <li key={evidence.itemId}>
            <span className="hardest-name">
              <NoteLabel
                value={item.pitch}
                naming={settings.naming}
                locale={settings.locale}
                octave
              />
            </span>
            <span className="hardest-track">
              <span style={{ width: `${percent}%` }} />
            </span>
            <span className="hardest-figures">
              <strong>{percent}%</strong>
              <small>
                {formatResponse(
                  quantileMs(totals),
                  t`< 1s`,
                  settings.locale === 'ru' ? ' с' : 's',
                )}
                {' · '}
                {totals.attempts}
              </small>
            </span>
            <span className="hardest-reason">
              {t(REASONS[reasonFor(evidence, now)])}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
