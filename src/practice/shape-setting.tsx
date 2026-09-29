import { useLingui } from '@lingui/react/macro';
import { useId } from 'react';

/** Whether questions are drawn with a random note value, with a "?" that says why anyone would. */
export function ShapeSetting({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const { t } = useLingui();
  const hintId = useId();
  return (
    <div className="setting-row">
      <div className="switch-row">
        <label className="switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>{t`Different note shapes`}</span>
        </label>
        <button
          type="button"
          className="help-button"
          aria-label={t`What is this?`}
          popoverTarget={hintId}
        >
          ?
        </button>
        <div id={hintId} popover="auto" className="help-popover">
          {t`Each note is drawn as a whole, half, quarter, eighth or sixteenth note at random. How long a note lasts never changes which note it is. Mixing the shapes stops you from memorising one picture instead of reading the staff. Turn it off to always see quarter notes.`}
        </div>
      </div>
    </div>
  );
}
