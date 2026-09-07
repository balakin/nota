import { useLingui } from '@lingui/react/macro';

import type { MidiController } from './use-midi-input';

/**
 * What the browser can currently see on the MIDI bus. Bluetooth keyboards are
 * paired in the operating system, so the only thing to say here is whether the
 * pairing came through.
 */
export function MidiStatus({ midi }: { midi: MidiController }) {
  const { t } = useLingui();
  const { status, devices } = midi;

  if (status === 'unsupported')
    return (
      <p className="midi-status is-warning">
        {t`This browser has no Web MIDI. Chrome, Edge or Opera over https can talk to a keyboard.`}
      </p>
    );

  if (status === 'denied')
    return (
      <p className="midi-status is-warning">
        {t`Nota may not use MIDI devices. Allow it in the site permissions, then connect again.`}{' '}
        <button type="button" className="link-button" onClick={midi.connect}>
          {t`Connect`}
        </button>
      </p>
    );

  if (status === 'connecting')
    return <p className="midi-status">{t`Looking for keyboards…`}</p>;

  if (status === 'idle')
    return (
      <p className="midi-status">
        <button type="button" className="link-button" onClick={midi.connect}>
          {t`Connect a MIDI keyboard`}
        </button>
      </p>
    );

  if (devices.length === 0)
    return (
      <p className="midi-status is-warning">
        {t`No keyboard yet. Pair it in your system Bluetooth settings and it will appear here.`}
      </p>
    );

  return (
    <p className="midi-status is-ready">
      <span className="midi-dot" aria-hidden="true" />
      {devices.join(' · ')}
    </p>
  );
}
