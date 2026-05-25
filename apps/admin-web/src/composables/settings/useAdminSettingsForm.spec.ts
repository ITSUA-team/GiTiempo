import { describe, expect, it } from 'vitest';
import { shallowRef } from 'vue';

import { useAdminSettingsForm } from './useAdminSettingsForm';

const persistedValues = {
  currency: 'USD',
  defaultHourlyRate: 120,
  timeZone: 'UTC',
  workspaceName: 'GiTiempo Studio',
};

describe('useAdminSettingsForm', () => {
  it('tracks dirty state and reset independently of server data', () => {
    const loading = shallowRef(false);
    const saving = shallowRef(false);
    const form = useAdminSettingsForm({ loading, saving });

    form.applyPersistedValues(persistedValues);
    expect(form.isDirty.value).toBe(false);

    form.form.currency = 'EUR';
    expect(form.isDirty.value).toBe(true);
    expect(form.canSave.value).toBe(true);

    saving.value = true;
    expect(form.canSave.value).toBe(false);

    form.resetForm();
    expect(form.form.currency).toBe('USD');
    expect(form.isDirty.value).toBe(false);
  });

  it('validates form values and stores field errors', () => {
    const form = useAdminSettingsForm({ loading: false, saving: false });

    form.applyPersistedValues(persistedValues);
    form.form.workspaceName = ' ';
    form.form.defaultHourlyRate = -1;
    form.form.timeZone = 'Not/AZone';

    expect(form.validateForm().values).toBeNull();
    expect(form.fieldErrors.workspaceName).toBe('Workspace name is required.');
    expect(form.fieldErrors.defaultHourlyRate).toBe(
      'Default hourly rate cannot be negative.',
    );
    expect(form.fieldErrors.timeZone).toBe('Invalid time zone');
  });
});
