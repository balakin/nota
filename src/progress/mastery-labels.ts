import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { MasteryState } from '../training/training';

export const MASTERY_STATE_LABELS: Record<MasteryState, MessageDescriptor> = {
  new: msg`New`,
  learning: msg`Learning`,
  recognized: msg`Recognized`,
  fluent: msg`Fluent`,
};
