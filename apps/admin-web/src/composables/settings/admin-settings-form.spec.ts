import { describe, expect, it } from 'vitest';

import {
  validateAdminSettingsForm,
  type AdminSettingsFormValues,
} from './admin-settings-form';

const validForm: AdminSettingsFormValues = {
  currency: 'USD',
  defaultHourlyRate: 120,
  timeRoundingStepMinutes: 1,
  timeZone: 'UTC',
  workspaceName: 'GiTiempo Studio',
};

describe('validateAdminSettingsForm', () => {
  it.each([0, 61, 1.5])(
    'blocks a rounding step of %d with the friendly message before any API call',
    (step) => {
      const result = validateAdminSettingsForm({
        ...validForm,
        timeRoundingStepMinutes: step,
      });

      expect(result.values).toBeNull();
      expect(result.errors.timeRoundingStepMinutes).toBe(
        'Time rounding step must be a whole number between 1 and 60.',
      );
    },
  );

  it('accepts an in-range rounding step without a rounding step error', () => {
    const result = validateAdminSettingsForm({
      ...validForm,
      timeRoundingStepMinutes: 5,
    });

    expect(result.errors.timeRoundingStepMinutes).toBeUndefined();
    expect(result.values?.timeRoundingStepMinutes).toBe(5);
  });
});