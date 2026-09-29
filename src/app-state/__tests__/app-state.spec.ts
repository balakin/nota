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

  it('keeps stored notes and sessions, and drops the removed learning path', () => {
    const state = migrateState({
      notes: { 'treble:G4': { totalAttempts: 12, state: 'recognized' } },
      learning: { levels: { 'treble-middle': { runs: 4, notes: {} } } },
      sessions: [{ id: 'a', attempts: 4 }],
    });
    expect(state.notes['treble:G4'].state).toBe('recognized');
    expect(state.sessions).toHaveLength(1);
    expect(state).not.toHaveProperty('learning');
  });
});

describe('saved presets in settings', () => {
  it('starts with none and keeps the ones stored', () => {
    expect(createInitialState().settings.customPresets).toEqual([]);
    const state = migrateState({
      settings: {
        customPresets: [
          {
            id: 'custom-1',
            name: 'Mine',
            clefs: ['bass'],
            range: { from: 48, to: 59 },
            accidentals: true,
          },
          { id: 'broken' },
        ],
      },
    });
    expect(state.settings.customPresets.map((preset) => preset.name)).toEqual([
      'Mine',
    ]);
  });
});
