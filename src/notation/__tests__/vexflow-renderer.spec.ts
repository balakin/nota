import { describe, expect, it } from 'vitest';

import { pitch } from '../../music/music';
import { renderNotation } from '../vexflow-renderer';

describe('notation renderer', () => {
  it('renders a deterministic staff and note into SVG', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 540 });
    renderNotation(container, pitch('C', 4), 'treble');
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelectorAll('path').length).toBeGreaterThan(5);
  });

  it('paints in the container colour so the theme can drive the ink', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 540 });
    renderNotation(container, pitch('C', 4), 'treble');
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('fill')).toBe('currentColor');
    expect(svg?.getAttribute('stroke')).toBe('currentColor');
  });

  /*
   * jsdom measures every glyph as zero-width, so this checks the placement arithmetic — which is
   * driven by the stave's geometry — and not the note head anchoring, which depends on real font
   * metrics and is only observable in a browser.
   */
  it('moves the note along the stave with its placement', () => {
    const headX = (placement: number) => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 540 });
      renderNotation(container, pitch('C', 4), 'treble', placement);
      const glyphs = container.querySelectorAll('text');
      return Number(glyphs[glyphs.length - 1].getAttribute('x'));
    };
    const left = headX(0);
    const middle = headX(0.5);
    const right = headX(1);
    expect(left).toBeLessThan(middle);
    expect(middle).toBeLessThan(right);
    // The whole note stays on the stave, which spans 16 to width - 16.
    expect(left).toBeGreaterThan(16);
    expect(right).toBeLessThan(540 - 16);
  });

  it('keeps the note on the stave when the placement is out of range', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 540 });
    renderNotation(container, pitch('C', 4), 'treble', 4);
    const glyphs = container.querySelectorAll('text');
    expect(Number(glyphs[glyphs.length - 1].getAttribute('x'))).toBeLessThan(
      540 - 16,
    );
  });

  it('draws an accidental glyph beside the note head', () => {
    const plain = document.createElement('div');
    const sharp = document.createElement('div');
    for (const container of [plain, sharp]) {
      Object.defineProperty(container, 'clientWidth', { value: 540 });
    }
    renderNotation(plain, pitch('F', 4), 'treble');
    renderNotation(sharp, pitch('F', 4, 'sharp'), 'treble');
    expect(sharp.querySelectorAll('text').length).toBe(
      plain.querySelectorAll('text').length + 1,
    );
  });
});
