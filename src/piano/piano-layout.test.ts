import { describe, expect, it } from 'vitest';
import { keyboardWindow, planKeyboard, visibleWhiteKeyCount, windowContains } from './piano-layout';
import { recognitionItem, pitch } from '../music/music';

describe('responsive piano layout', () => {
  it('uses a wider target for coarse pointers', () => {
    expect(visibleWhiteKeyCount(375, 'coarse')).toBe(8);
    expect(visibleWhiteKeyCount(375, 'fine')).toBe(10);
    expect(visibleWhiteKeyCount(1200, 'fine')).toBeGreaterThan(20);
  });

  it('creates a window that contains its anchor without moving question by question', () => {
    const window = keyboardWindow(480, 'coarse', 60);
    expect(windowContains(window, 60)).toBe(true);
    expect(keyboardWindow(480, 'coarse', 60).startIndex).toBe(window.startIndex);
  });

  it('constrains a broad curriculum to one stable window', () => {
    const candidates = [
      recognitionItem('treble', pitch('C', 4)),
      recognitionItem('treble', pitch('F', 5)),
    ];
    const plan = planKeyboard(320, 'coarse', candidates);
    expect(plan.window.whiteKeys.length).toBe(7);
    expect(plan.candidates.every((item) => windowContains(plan.window, item.pitch.midi))).toBe(
      true,
    );
  });
});
