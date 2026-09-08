import { describe, expect, it } from 'vitest';

import { createInitialState, migrateState } from '../app-state';

describe('local state schema', () => {
  it('creates a versioned state with both clefs', () => {
    const state = createInitialState({ hasCompletedOnboarding: true });
    expect(state.schemaVersion).toBe(4);
    expect(state.rolls).toEqual({});
    expect(Object.keys(state.notes)).toEqual(
      expect.arrayContaining(['treble:G4', 'bass:C4']),
    );
  });

  it('starts the learning path with no level touched', () => {
    expect(createInitialState().learning.levels).toEqual({});
  });

  it('leaves the path untouched by a state that never had one', () => {
    const state = migrateState({
      notes: { 'treble:G4': { totalAttempts: 12, state: 'recognized' } },
      sessions: [{ id: 'a', attempts: 4 }],
    });
    expect(state.notes['treble:G4'].state).toBe('recognized');
    /* Train practice never opens a level, so the path starts at zero. */
    expect(state.learning.levels).toEqual({});
    expect(state.sessions[0].track).toBe('train');
  });

  it('carries the old note-stat chain over as levels already learned', () => {
    const state = migrateState({
      learning: {
        notes: {
          'treble:G4': { state: 'recognized', lastPracticedAt: 42 },
          'treble:C4': { state: 'new' },
        },
      },
    });
    const level = state.learning.levels['treble-middle'];
    expect(level.notes['treble:G4']).toMatchObject({
      credits: 3,
      introduced: true,
      lastCreditAt: 42,
    });
    expect(level.notes['treble:C4']).toBeUndefined();
  });

  it('keeps stored level credits and drops levels it does not know', () => {
    const state = migrateState({
      learning: {
        levels: {
          'treble-middle': {
            runs: 4,
            notes: { 'treble:G4': { credits: 2, introduced: true, lapses: 1 } },
          },
          'nowhere-level': { runs: 9, notes: {} },
        },
      },
      sessions: [{ id: 'b', track: 'learning', levelId: 'treble-middle' }],
    });
    expect(state.learning.levels['treble-middle']).toMatchObject({ runs: 4 });
    expect(
      state.learning.levels['treble-middle'].notes['treble:G4'],
    ).toMatchObject({ credits: 2, lapses: 1 });
    expect(state.learning.levels['nowhere-level']).toBeUndefined();
    expect(state.sessions[0]).toMatchObject({
      track: 'learning',
      levelId: 'treble-middle',
    });
  });

  it('migrates malformed or older data without losing valid settings', () => {
    const state = migrateState({
      settings: { locale: 'ru', naming: 'solfege', theme: 'dark' },
    });
    expect(state.schemaVersion).toBe(4);
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
