import { describe, expect, it } from 'vitest';

import { createInitialState, migrateState } from '../app-state';

describe('local state schema', () => {
  it('creates a versioned state with both clefs', () => {
    const state = createInitialState({ hasCompletedOnboarding: true });
    expect(state.schemaVersion).toBe(2);
    expect(state.rolls).toEqual({});
    expect(Object.keys(state.notes)).toEqual(
      expect.arrayContaining(['treble:G4', 'bass:C4']),
    );
  });

  it('migrates malformed or older data without losing valid settings', () => {
    const state = migrateState({
      settings: { locale: 'ru', naming: 'solfege', theme: 'dark' },
    });
    expect(state.schemaVersion).toBe(2);
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
