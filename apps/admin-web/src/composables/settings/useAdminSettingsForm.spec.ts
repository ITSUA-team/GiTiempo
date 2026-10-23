import { describe, expect, it } from 'vitest';

import { useAdminSettingsForm } from './useAdminSettingsForm';

const persistedValues = {
  currency: 'USD',
  defaultHourlyRate: 120,
  timeRoundingStepMinutes: 1,
  timeZone: 'UTC',
  workspaceName: 'GiTiempo Studio',
};

describe('useAdminSettingsForm', () => {
  it('applies persisted values and derives dirty state from edits', () => {
    const settingsForm = useAdminSettingsForm();

    settingsForm.applyPersistedValues(persistedValues);

    expect(settingsForm.form.workspaceName).toBe('GiTiempo Studio');
    expect(settingsForm.form.defaultHourlyRate).toBe(120);
    expect(settingsForm.form.currency).toBe('USD');
    expect(settingsForm.form.timeRoundingStepMinutes).toBe(1);
    expect(settingsForm.form.timeZone).toBe('UTC');
    expect(settingsForm.isDirty.value).toBe(false);

    settingsForm.form.currency = 'EUR';

    expect(settingsForm.isDirty.value).toBe(true);
  });

  it('flags rounding step edits as dirty and restores them on reset', () => {
    const settingsForm = useAdminSettingsForm();

    settingsForm.applyPersistedValues(persistedValues);
    settingsForm.form.timeRoundingStepMinutes = 30;

    expect(settingsForm.isDirty.value).toBe(true);

    settingsForm.resetForm();

    expect(settingsForm.form.timeRoundingStepMinutes).toBe(1);
    expect(settingsForm.isDirty.value).toBe(false);
  });

  it('resets pending edits without changing persisted values', () => {
    const settingsForm = useAdminSettingsForm();

    settingsForm.applyPersistedValues(persistedValues);
    settingsForm.form.workspaceName = 'Draft Name';
    settingsForm.form.defaultHourlyRate = null;
    settingsForm.form.timeZone = 'Europe/Kyiv';
    settingsForm.resetForm();

    expect(settingsForm.form.workspaceName).toBe('GiTiempo Studio');
    expect(settingsForm.form.defaultHourlyRate).toBe(120);
    expect(settingsForm.form.timeZone).toBe('UTC');
    expect(settingsForm.isDirty.value).toBe(false);
  });

  it('validates and exposes field errors for invalid values', () => {
    const settingsForm = useAdminSettingsForm();

    settingsForm.applyPersistedValues(persistedValues);
    settingsForm.form.workspaceName = ' ';
    settingsForm.form.defaultHourlyRate = -1;
    settingsForm.form.timeRoundingStepMinutes = 0;
    settingsForm.form.timeZone = 'Not/AZone';

    const validation = settingsForm.validateForm();

    expect(validation.values).toBeNull();
    expect(settingsForm.fieldErrors.workspaceName).toBe(
      'Workspace name is required.',
    );
    expect(settingsForm.fieldErrors.defaultHourlyRate).toBe(
      'Default hourly rate cannot be negative.',
    );
    expect(settingsForm.fieldErrors.timeRoundingStepMinutes).toBe(
      'Time rounding step must be a whole number between 1 and 60.',
    );
    expect(settingsForm.fieldErrors.timeZone).toBe('Invalid time zone');
  });

  it('keeps unknown loaded currencies selectable', () => {
    const settingsForm = useAdminSettingsForm();

    settingsForm.applyPersistedValues({
      ...persistedValues,
      currency: 'CHF',
    });

    expect(settingsForm.currencyOptions.value[0]).toEqual({
      label: 'CHF',
      value: 'CHF',
    });
  });
});
