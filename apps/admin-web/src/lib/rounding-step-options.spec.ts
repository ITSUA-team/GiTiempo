import { roundingStepMinutesSchema } from '@gitiempo/shared';
import { describe, expect, it } from 'vitest';

import {
  getInheritRoundingStepOption,
  getRoundingStepOptions,
  INHERIT_ROUNDING_STEP_SENTINEL,
  ROUNDING_STEP_MINUTES_PRESETS,
  toApiRoundingStepMinutes,
  toFormRoundingStepMinutes,
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
      value: INHERIT_ROUNDING_STEP_SENTINEL,
    });
  });

  describe('toFormRoundingStepMinutes', () => {
    it('maps a null project step to the inherit sentinel', () => {
      expect(toFormRoundingStepMinutes(null)).toBe(INHERIT_ROUNDING_STEP_SENTINEL);
    });

    it('keeps an explicit step in the form', () => {
      expect(toFormRoundingStepMinutes(15)).toBe(15);
    });

    it('maps an undefined project step to the inherit sentinel', () => {
      expect(toFormRoundingStepMinutes(undefined)).toBe(INHERIT_ROUNDING_STEP_SENTINEL);
    });
  });

  describe('toApiRoundingStepMinutes', () => {
    it('converts the inherit sentinel to null for the API', () => {
      expect(toApiRoundingStepMinutes(INHERIT_ROUNDING_STEP_SENTINEL)).toBeNull();
    });

    it('keeps an explicit step for the API', () => {
      expect(toApiRoundingStepMinutes(15)).toBe(15);
    });

    it('passes null through to the API', () => {
      expect(toApiRoundingStepMinutes(null)).toBeNull();
    });
  });
});
