import { describe, expect, it } from 'vitest';
import { createInitialState, migrateState } from '../app-state';

describe('local state schema', () => {
  it('creates a versioned state with both clefs', () => {
    const state = createInitialState({ hasCompletedOnboarding: true });
    expect(state.schemaVersion).toBe(1);
    expect(Object.keys(state.notes)).toEqual(expect.arrayContaining(['treble:G4', 'bass:C4']));
  });

  it('migrates malformed or older data without losing valid settings', () => {
    const state = migrateState({ settings: { locale: 'ru', naming: 'solfege', theme: 'dark' } });
    expect(state.schemaVersion).toBe(1);
    expect(state.settings).toMatchObject({ locale: 'ru', naming: 'solfege', theme: 'dark' });
    expect(state.notes['treble:G4']).toBeDefined();
  });
});
