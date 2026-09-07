export type AnswerInputSource = 'piano' | 'midi' | 'keyboard';

/** A normalized answer keeps the training engine independent from input hardware. */
export type NormalizedAnswer = {
  midi: number;
  source: AnswerInputSource;
};

export type AnswerListener = (answer: NormalizedAnswer) => void;

export interface AnswerInputProvider {
  subscribe(listener: AnswerListener): () => void;
}

export function pianoAnswer(midi: number): NormalizedAnswer {
  return { midi, source: 'piano' };
}

export function keyboardAnswer(midi: number): NormalizedAnswer {
  return { midi, source: 'keyboard' };
}

export function midiAnswer(midi: number): NormalizedAnswer {
  return { midi, source: 'midi' };
}
