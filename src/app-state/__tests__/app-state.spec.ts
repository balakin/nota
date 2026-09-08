import { describe, expect, it } from 'vitest';

import { createInitialState, migrateState } from '../app-state';

describe('local state schema', () => {
  it('creates a versioned state with both clefs', () => {
    const state = createInitialState({ hasCompletedOnboarding: true });
    expect(state.schemaVersion).toBe(3);
    expect(state.rolls).toEqual({});
    expect(Object.keys(state.notes)).toEqual(
      expect.arrayContaining(['treble:G4', 'bass:C4']),
    );
  });

  it('starts the learning path on its own chain of note stats', () => {
    const state = createInitialState();
    expect(state.learning.notes['treble:G4'].state).toBe('new');
    expect(state.learning.notes).not.toBe(state.notes);
  });

  it('gives a state saved before the learning path a fresh one', () => {
    const state = migrateState({
      notes: { 'treble:G4': { totalAttempts: 12, state: 'recognized' } },
      sessions: [{ id: 'a', attempts: 4 }],
    });
    expect(state.notes['treble:G4'].state).toBe('recognized');
    /* Train practice never opens a level, so the path starts at zero. */
    expect(state.learning.notes['treble:G4'].state).toBe('new');
    expect(state.sessions[0].track).toBe('train');
  });

  it('keeps a stored learning chain and the track of its sessions', () => {
    const state = migrateState({
      learning: {
        notes: { 'treble:C4': { totalAttempts: 9, state: 'fluent' } },
      },
      sessions: [{ id: 'b', track: 'learning', levelId: 'treble-octave-4' }],
    });
    expect(state.learning.notes['treble:C4'].state).toBe('fluent');
    expect(state.learning.notes['treble:C4'].totalAttempts).toBe(9);
    expect(state.sessions[0]).toMatchObject({
      track: 'learning',
      levelId: 'treble-octave-4',
    });
  });

  it('migrates malformed or older data without losing valid settings', () => {
    const state = migrateState({
      settings: { locale: 'ru', naming: 'solfege', theme: 'dark' },
    });
    expect(state.schemaVersion).toBe(3);
    expect(state.settings).toMatchObject({
      locale: 'ru',
      naming: 'solfege',
      theme: 'dark',
    });
    /* An older state predates the setting, so it falls back to the default. */
    expect(state.settings.speedDeadlineMs).toBe(2000);
    expect(state.notes['treble:G4']).toBeDefined();
  });

  it('keeps a chosen speed deadline and clamps an impossible one', () => {
    expect(
      migrateState({ settings: { speedDeadlineMs: 1000 } }).settings
        .speedDeadlineMs,
    ).toBe(1000);
    expect(
      migrateState({ settings: { speedDeadlineMs: 0 } }).settings
        .speedDeadlineMs,
    ).toBe(1000);
    expect(
      migrateState({ settings: { speedDeadlineMs: '2s' } }).settings
        .speedDeadlineMs,
    ).toBe(2000);
  });
});
