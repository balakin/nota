import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';

import type { Clef } from '../music/music';
import {
  MAX_CUSTOM_PRESETS,
  MAX_PRESET_NAME_LENGTH,
  RANGE_PRESETS,
  type CustomPreset,
  type PresetGroup,
  type PresetValues,
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
  customPresets,
  onPick,
  onSave,
  onDelete,
}: {
  clefs: readonly Clef[];
  range: PitchRange;
  accidentals: boolean;
  customPresets: readonly CustomPreset[];
  onPick: (preset: PresetValues) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useLingui();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const groupName = (group: PresetGroup) =>
    group === 'treble'
      ? t`Treble`
      : group === 'bass'
        ? t`Bass`
        : t`Treble + Bass`;
  const current = clampRange(range, clefs);
  /* A built-in can be saved as one's own, but the same setup twice would only add a second chip. */
  const alreadySaved = customPresets.some((preset) =>
    matchesPreset(preset, clefs, current, accidentals),
  );
  const builtIn = RANGE_PRESETS.find((preset) =>
    matchesPreset(preset, clefs, current, accidentals),
  );
  const canSave = !alreadySaved && customPresets.length < MAX_CUSTOM_PRESETS;
  const save = () => {
    if (!name.trim()) return;
    onSave(name);
    setName('');
    setNaming(false);
  };
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
        <div className="preset-group" role="group" aria-label={t`My presets`}>
          <span className="preset-group-name" aria-hidden="true">
            {t`My presets`}
          </span>
          <div className="preset-chips">
            {customPresets.map((preset) => (
              <span className="preset-custom" key={preset.id}>
                <button
                  type="button"
                  className={`preset ${matchesPreset(preset, clefs, current, accidentals) ? 'selected' : ''}`}
                  aria-pressed={matchesPreset(
                    preset,
                    clefs,
                    current,
                    accidentals,
                  )}
                  onClick={() => onPick(preset)}
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  className="preset-delete"
                  aria-label={t`Delete preset ${preset.name}`}
                  onClick={() => onDelete(preset.id)}
                >
                  ×
                </button>
              </span>
            ))}
            {naming ? (
              <form
                className="preset-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  save();
                }}
              >
                <input
                  type="text"
                  value={name}
                  maxLength={MAX_PRESET_NAME_LENGTH}
                  placeholder={t`Name`}
                  aria-label={t`Preset name`}
                  autoFocus
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setNaming(false);
                  }}
                />
                <button
                  type="submit"
                  className="preset selected"
                  disabled={!name.trim()}
                >
                  {t`Save`}
                </button>
                <button
                  type="button"
                  className="preset"
                  onClick={() => setNaming(false)}
                >
                  {t`Cancel`}
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="preset preset-add"
                disabled={!canSave}
                title={
                  alreadySaved ? t`This setup is already saved.` : undefined
                }
                onClick={() => {
                  /* A built-in preset is offered under its own name, ready to keep or rename. */
                  setName(
                    builtIn
                      ? `${groupName(builtIn.group)}, ${t(builtIn.title)}`
                      : '',
                  );
                  setNaming(true);
                }}
              >
                + {t`Save current setup`}
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="setting-hint">{t`Each row goes from easiest to hardest. Start anywhere.`}</p>
    </div>
  );
}
