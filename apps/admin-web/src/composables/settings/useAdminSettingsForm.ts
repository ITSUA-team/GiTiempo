import { computed, reactive, shallowRef } from 'vue';

import {
  DEFAULT_SETTINGS_CURRENCY,
  getSettingsCurrencyOptions,
} from '@/lib/currencies';
import {
  getRuntimeDefaultTimeZone,
  getSettingsTimeZoneOptions,
} from '@/lib/time-zones';
import {
  validateAdminSettingsForm,
  type AdminSettingsFieldErrors,
  type AdminSettingsFormValues,
} from './admin-settings-form';

function assignForm(
  form: AdminSettingsFormValues,
  values: AdminSettingsFormValues,
): void {
  form.currency = values.currency;
  form.defaultHourlyRate = values.defaultHourlyRate;
  form.timeRoundingStepMinutes = values.timeRoundingStepMinutes;
  form.timeZone = values.timeZone;
  form.workspaceName = values.workspaceName;
}

function clearFieldErrors(fieldErrors: AdminSettingsFieldErrors): void {
  for (const key of Object.keys(fieldErrors) as Array<
    keyof AdminSettingsFieldErrors
  >) {
    delete fieldErrors[key];
  }
}

function assignFieldErrors(
  fieldErrors: AdminSettingsFieldErrors,
  errors: AdminSettingsFieldErrors,
): void {
  clearFieldErrors(fieldErrors);
  Object.assign(fieldErrors, errors);
}

export function useAdminSettingsForm() {
  const persisted = shallowRef<AdminSettingsFormValues | null>(null);
  const fieldErrors = reactive<AdminSettingsFieldErrors>({});
  const form = reactive<AdminSettingsFormValues>({
    currency: DEFAULT_SETTINGS_CURRENCY,
    defaultHourlyRate: null,
    timeRoundingStepMinutes: 1,
    timeZone: getRuntimeDefaultTimeZone(),
    workspaceName: '',
  });
  const isDirty = computed(() => {
    const current = persisted.value;
    if (!current) return false;

    return (
      form.workspaceName !== current.workspaceName ||
      form.defaultHourlyRate !== current.defaultHourlyRate ||
      form.currency !== current.currency ||
      form.timeRoundingStepMinutes !== current.timeRoundingStepMinutes ||
      form.timeZone !== current.timeZone
    );
  });
  const currencyOptions = computed(() =>
    getSettingsCurrencyOptions(form.currency),
  );
  const timeZoneOptions = computed(() =>
    getSettingsTimeZoneOptions([persisted.value?.timeZone, form.timeZone]),
  );

  function applyPersistedValues(values: AdminSettingsFormValues): void {
    persisted.value = values;
    assignForm(form, values);
    clearFieldErrors(fieldErrors);
  }

  function assignFormValues(values: AdminSettingsFormValues): void {
    assignForm(form, values);
    clearFieldErrors(fieldErrors);
  }

  function resetForm(): void {
    if (!persisted.value) return;
    assignFormValues(persisted.value);
  }

  function validateForm() {
    const validation = validateAdminSettingsForm({ ...form });
    assignFieldErrors(fieldErrors, validation.errors);

    return validation;
  }

  return {
    applyPersistedValues,
    assignFormValues,
    currencyOptions,
    fieldErrors,
    form,
    isDirty,
    persisted,
    resetForm,
    timeZoneOptions,
    validateForm,
  };
}
