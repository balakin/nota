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
});
