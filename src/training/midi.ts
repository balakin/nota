/**
 * Decoding for the Web MIDI byte stream. Kept free of browser objects so the
 * message handling can be tested without a device.
 */

const NOTE_ON = 0x90;

/** Lowest and highest pitch a standard MIDI note number can carry. */
const LOWEST = 0;
const HIGHEST = 127;

/**
 * The note number of a key press, or null for anything else on the wire.
 *
 * Controllers are free to send a note-on with zero velocity instead of a
 * note-off, so velocity decides whether a key went down or came up. Channel
 * bits are ignored: the training engine does not care which channel a keyboard
 * is set to.
 */
export function noteOnFrom(data: Uint8Array | null | undefined): number | null {
  if (!data || data.length < 3) return null;
  const [status, note, velocity] = data;
  if ((status & 0xf0) !== NOTE_ON) return null;
  if (velocity === 0) return null;
  if (note < LOWEST || note > HIGHEST) return null;
  return note;
}
