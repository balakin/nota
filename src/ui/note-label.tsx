import type { Locale } from '../app-state/app-state';
import {
  noteBaseName,
  type CanonicalPitch,
  type NamingSystem,
} from '../music/music';

import { AccidentalSign } from './accidental-sign';

/** Few UI faces carry ♯ and ♭, so the sign is set separately and kerned back to the letter. */
export function NoteLabel({
  value,
  naming,
  locale,
  octave = false,
}: {
  value: CanonicalPitch;
  naming: NamingSystem;
  locale: Locale;
  octave?: boolean;
}) {
  return (
    <span className="note-label">
      {noteBaseName(value, naming, locale)}
      <AccidentalSign accidental={value.accidental} />
      {octave ? <small className="note-octave">{value.octave}</small> : null}
    </span>
  );
}
