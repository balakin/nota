import { useLingui } from '@lingui/react/macro';

import type { Clef } from '../music/music';
import {
  RANGE_PRESETS,
  type PresetGroup,
  type RangePreset,
} from '../training/presets';
import {
  clampRange,
  matchesPreset,
  selectedItems,
  type PitchRange,
} from '../training/selection';

const GROUPS: readonly PresetGroup[] = ['treble', 'bass', 'both'];

/**
 * A short path for someone who does not yet know what to practise: each entry sets the clefs,
 * the range and whether sharps and flats are asked. Entries are listed by clef, and within a row
 * they run from the easiest to the hardest, so reading left to right and top to bottom is the
 * order to learn them in. The fields below stay editable, and the entry that matches them
 * lights up.
 */
export function PresetPicker({
  clefs,
  range,
  accidentals,
  onPick,
}: {
  clefs: readonly Clef[];
  range: PitchRange;
  accidentals: boolean;
  onPick: (preset: RangePreset) => void;
}) {
  const { t } = useLingui();
  const groupName = (group: PresetGroup) =>
    group === 'treble'
      ? t`Treble`
      : group === 'bass'
        ? t`Bass`
        : t`Treble + Bass`;
  const current = clampRange(range, clefs);
  return (
    <div className="setting-row">
      <span className="setting-label">{t`Presets`}</span>
      <div className="preset-groups">
        {GROUPS.map((group) => (
          <div
            key={group}
            className="preset-group"
            role="group"
            aria-label={groupName(group)}
          >
            <span className="preset-group-name" aria-hidden="true">
              {groupName(group)}
            </span>
            <div className="preset-chips">
              {RANGE_PRESETS.filter((preset) => preset.group === group).map(
                (preset) => {
                  const active = matchesPreset(
                    preset,
                    clefs,
                    current,
                    accidentals,
                  );
                  const count = selectedItems(
                    preset.clefs,
                    preset.range,
                    preset.accidentals,
                  ).length;
                  return (
                    <button
                      type="button"
                      key={preset.id}
                      className={`preset ${active ? 'selected' : ''}`}
                      aria-pressed={active}
                      title={t`${count} notes`}
                      onClick={() => onPick(preset)}
                    >
                      {t(preset.title)}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="setting-hint">{t`Each row goes from easiest to hardest. Start anywhere.`}</p>
    </div>
  );
}
