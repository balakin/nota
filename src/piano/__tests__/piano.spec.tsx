import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { i18n } from '../../i18n/i18n';
import { pitch } from '../../music/music';
import type { NormalizedAnswer } from '../../training/input';
import { Piano } from '../piano';
import { octaveWindow } from '../piano-layout';

function renderPiano(onAnswer = vi.fn<(answer: NormalizedAnswer) => void>()) {
  render(
    <I18nProvider i18n={i18n}>
      <Piano window={octaveWindow(4)} naming="letters" locale="en" showLabels onAnswer={onAnswer} />
    </I18nProvider>,
  );
  return onAnswer;
}

describe('Piano', () => {
  it('offers all twelve keys of the octave as answers', () => {
    renderPiano();
    expect(screen.getAllByRole('button')).toHaveLength(12);
  });

  it('answers a black key with the pitch both spellings share', async () => {
    const onAnswer = renderPiano();
    const key = screen.getByRole('button', { name: /F♯4/ });
    key.click();
    expect(onAnswer).toHaveBeenCalledWith({ midi: pitch('F', 4, 'sharp').midi, source: 'piano' });
  });
});
