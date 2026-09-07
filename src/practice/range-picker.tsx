import { useLingui } from '@lingui/react/macro';

import type { Locale } from '../app-state/app-state';
import { displayNoteName, type Clef, type NamingSystem } from '../music/music';
import {
  curriculumFor,
  rangeBounds,
  selectedItems,
  type PitchRange,
} from '../training/selection';

/** One entry per pitch, so a key with two spellings is offered once. */
function pitchStops(clefs: readonly Clef[]) {
  const seen = new Set<number>();
  return curriculumFor(clefs).filter((item) => {
    if (seen.has(item.pitch.midi)) return false;
    seen.add(item.pitch.midi);
    return true;
  });
}

export function TrainingRangePicker({
  clefs,
  range,
  naming,
  locale,
  onChange,
}: {
  clefs: Clef[];
  range: PitchRange;
  naming: NamingSystem;
  locale: Locale;
  onChange: (range: PitchRange) => void;
}) {
  const { t } = useLingui();
  const stops = pitchStops(clefs);
  const bounds = rangeBounds(clefs);
  const count = selectedItems(clefs, range).length;
  const name = (midi: number) => {
    const stop = stops.find((one) => one.pitch.midi === midi);
    return stop
      ? `${displayNoteName(stop.pitch, naming, locale)}${String(stop.pitch.octave)}`
      : '';
  };
  const isWhole = range.from === bounds.from && range.to === bounds.to;

  return (
    <div className="setting-row">
      <span className="setting-label">{t`Note range`}</span>
      <div className="range-field">
        <select
          aria-label={t`Lowest note`}
          value={range.from}
          onChange={(event) => {
            const midi = Number(event.target.value);
            onChange({ from: midi, to: Math.max(midi, range.to) });
          }}
        >
          {stops.map((stop) => (
            <option key={stop.pitch.midi} value={stop.pitch.midi}>
              {name(stop.pitch.midi)}
            </option>
          ))}
        </select>
        <span className="range-dash" aria-hidden="true">
          –
        </span>
        <select
          aria-label={t`Highest note`}
          value={range.to}
          onChange={(event) => {
            const midi = Number(event.target.value);
            onChange({ from: Math.min(midi, range.from), to: midi });
          }}
        >
          {stops.map((stop) => (
            <option key={stop.pitch.midi} value={stop.pitch.midi}>
              {name(stop.pitch.midi)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="range-reset"
          disabled={isWhole}
          onClick={() => {
            onChange(bounds);
          }}
        >
          {t`All`}
        </button>
      </div>
      <small className="range-count">
        {count} {t`notes selected`}
      </small>
    </div>
  );
}
