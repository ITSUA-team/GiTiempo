<script setup lang="ts">
import { computed, watch } from 'vue';
import { SurfaceCard } from '@gitiempo/web-shared';
import Button from 'primevue/button';

import SettingsForm from '@/components/settings/SettingsForm.vue';
import SettingsPageSkeleton from '@/components/settings/SettingsPageSkeleton.vue';
import { useToasts } from '@/composables/feedback/useToasts';
import { useAdminSettingsData } from '@/composables/settings/useAdminSettingsData';
import { useAdminSettingsForm } from '@/composables/settings/useAdminSettingsForm';
import { useAdminSettingsPersistence } from '@/composables/settings/useAdminSettingsPersistence';
import { toAdminSettingsFormValues } from '@/composables/settings/admin-settings-form';
import { getAdminServerStateScope } from '@/lib/server-state-scope';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { errorToast, successToast } = useToasts();
const accessToken = computed(() => authStore.accessToken);
const scope = computed(() => getAdminServerStateScope(authStore.accessToken));
const settingsForm = useAdminSettingsForm();
const settingsData = useAdminSettingsData({
  accessToken,
  onError(message, error, action) {
    errorToast(message, {
      error,
      logContext: { action, feature: 'settings' },
    });
  },
  scope,
});
const settingsPersistence = useAdminSettingsPersistence({
  accessToken,
  onError(message, error) {
    errorToast(message, {
      error,
      logContext: { action: 'save-settings', feature: 'settings' },
    });
  },
  scope,
});
const {
  currencyOptions,
  fieldErrors,
  form,
  isDirty,
  persisted,
  resetForm,
  timeZoneOptions,
  validateForm,
} = settingsForm;
const {
  initialLoaded,
  loading,
  requestError,
  result: loadedSettings,
  retryLoad,
} = settingsData;
const { saveSettings: persistSettings, saving } = settingsPersistence;
const canSave = computed(() => isDirty.value && !saving.value && !loading.value);

function syncWorkspaceName(values = persisted.value): void {
  if (!values) return;
  authStore.setWorkspaceName(values.workspaceName);
}

async function retryLoadSettings(): Promise<void> {
  const nextData = await retryLoad();
  if (!nextData) return;

  const values = toAdminSettingsFormValues(nextData.workspace, nextData.settings);
  settingsForm.applyPersistedValues(values);
  syncWorkspaceName(values);
}

async function saveSettings(): Promise<void> {
  const validation = validateForm();
  const result = await persistSettings({
    current: persisted.value,
    settings: settingsData.settings.value,
    values: validation.values,
    workspace: settingsData.workspace.value,
  });

  if (!result) return;

  if (!result.wroteChanges) {
    settingsForm.assignFormValues(result.values);
    return;
  }

  settingsData.applySettingsData({
    settings: result.settings,
    workspace: result.workspace,
  });
  settingsForm.applyPersistedValues(result.values);
  syncWorkspaceName(result.values);
  successToast('Settings saved.');
}

watch(
  loadedSettings,
  (nextData) => {
    if (!nextData) return;

    const values = toAdminSettingsFormValues(nextData.workspace, nextData.settings);
    settingsForm.applyPersistedValues(values);
    syncWorkspaceName(values);
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex flex-col gap-6">
    <SettingsPageSkeleton v-if="loading && !initialLoaded" />

    <template v-else>
      <SurfaceCard
        v-if="requestError && !loading"
        class="max-w-[620px]"
        padding-class="p-6"
      >
        <div class="flex flex-col items-center gap-3 py-6 text-center">
          <span class="text-text-dark text-[15px] font-semibold">
            Failed to load settings
          </span>
          <span class="text-text-muted text-[13px]">
            {{ requestError }}
          </span>
          <Button
            label="Try again"
            severity="secondary"
            outlined
            :loading="loading"
            @click="retryLoadSettings"
          />
        </div>
      </SurfaceCard>

      <SettingsForm
        v-else
        v-model:workspace-name="form.workspaceName"
        v-model:default-hourly-rate="form.defaultHourlyRate"
        v-model:currency="form.currency"
        v-model:time-zone="form.timeZone"
        :can-save="canSave"
        :currency-options="currencyOptions"
        :field-errors="fieldErrors"
        :is-dirty="isDirty"
        :saving="saving"
        :time-zone-options="timeZoneOptions"
        @cancel="resetForm"
        @save="saveSettings"
      />
    </template>
  </div>
</template>
