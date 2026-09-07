import { describe, expect, it } from 'vitest';

import { noteOnFrom } from '../midi';

const message = (...bytes: number[]) => new Uint8Array(bytes);

describe('noteOnFrom', () => {
  it('reads the note number of a key press', () => {
    expect(noteOnFrom(message(0x90, 60, 100))).toBe(60);
  });

  it('accepts a press on any channel', () => {
    expect(noteOnFrom(message(0x99, 45, 64))).toBe(45);
  });

  it('ignores a note-on with zero velocity, which means the key came up', () => {
    expect(noteOnFrom(message(0x90, 60, 0))).toBeNull();
  });

  it('ignores note-off', () => {
    expect(noteOnFrom(message(0x80, 60, 64))).toBeNull();
  });

  it('ignores control, pitch bend and clock traffic', () => {
    expect(noteOnFrom(message(0xb0, 64, 127))).toBeNull();
    expect(noteOnFrom(message(0xe0, 0, 64))).toBeNull();
    expect(noteOnFrom(message(0xf8))).toBeNull();
  });

  it('ignores a truncated or absent message', () => {
    expect(noteOnFrom(message(0x90, 60))).toBeNull();
    expect(noteOnFrom(null)).toBeNull();
    expect(noteOnFrom(undefined)).toBeNull();
  });
});
