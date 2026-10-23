import { roundingStepMinutesSchema } from '@gitiempo/shared';
import { describe, expect, it } from 'vitest';

import {
  getInheritRoundingStepOption,
  getRoundingStepOptions,
  ROUNDING_STEP_MINUTES_PRESETS,
} from './rounding-step-options';

describe('rounding-step-options', () => {
  it('offers the preset steps without a no-rounding option', () => {
    expect(getRoundingStepOptions()).toEqual([
      { label: '1 min', value: 1 },
      { label: '5 min', value: 5 },
      { label: '10 min', value: 10 },
      { label: '15 min', value: 15 },
      { label: '30 min', value: 30 },
      { label: '60 min', value: 60 },
    ]);
  });

  it('does not offer steps the contract would reject', () => {
    for (const stepMinutes of ROUNDING_STEP_MINUTES_PRESETS) {
      expect(() =>
        roundingStepMinutesSchema.parse(stepMinutes),
      ).not.toThrow();
    }
  });

  it('names the inherit option after the workspace step', () => {
    expect(getInheritRoundingStepOption(5)).toEqual({
      label: 'Inherit from workspace (5 min)',
      value: null,
    });
  });
});
