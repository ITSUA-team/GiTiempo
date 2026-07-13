<script setup lang="ts">
import { computed, watch } from 'vue';

import RequestErrorCard from '@/components/RequestErrorCard.vue';
import SettingsForm from '@/components/settings/SettingsForm.vue';
import SettingsGitHubAccountCard from '@/components/settings/SettingsGitHubAccountCard.vue';
import SettingsGitHubWorkspaceAccessCard from '@/components/settings/SettingsGitHubWorkspaceAccessCard.vue';
import SettingsPageSkeleton from '@/components/settings/SettingsPageSkeleton.vue';
import { buildGitHubProfileHref } from '@/components/settings/github-workspace-access';
import { appEnv } from '@/config/env';
import { useToasts } from '@/composables/feedback/useToasts';
import { useAdminSettingsData } from '@/composables/settings/useAdminSettingsData';
import { useAdminSettingsForm } from '@/composables/settings/useAdminSettingsForm';
import { useAdminSettingsGitHubConnection } from '@/composables/settings/useAdminSettingsGitHubConnection';
import { useAdminWorkspaceGitHubOrganizations } from '@/composables/settings/useAdminWorkspaceGitHubOrganizations';
import { useAdminSettingsPersistence } from '@/composables/settings/useAdminSettingsPersistence';
import { toAdminSettingsFormValues } from '@/composables/settings/admin-settings-form';
import { getAdminServerStateScope } from '@/lib/server-state-scope';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { errorToast, successToast } = useToasts();
const isAuthenticated = computed(() => Boolean(authStore.accessToken));
const scope = computed(() => getAdminServerStateScope(authStore.accessToken));
const settingsForm = useAdminSettingsForm();
const settingsData = useAdminSettingsData({
  enabled: isAuthenticated,
  onError(message, error, action) {
    errorToast(message, {
      error,
      logContext: { action, feature: 'settings' },
    });
  },
  scope,
});
const settingsPersistence = useAdminSettingsPersistence({
  enabled: isAuthenticated,
  onError(message, error) {
    errorToast(message, {
      error,
      logContext: { action: 'save-settings', feature: 'settings' },
    });
  },
  scope,
});
const githubConnection = useAdminSettingsGitHubConnection({
  enabled: isAuthenticated,
  onError(message, error, action) {
    errorToast(message, {
      error,
      logContext: { action, feature: 'settings-github-connection' },
    });
  },
  scope,
});
const canAddGitHubOrganization = computed(
  () =>
    isAuthenticated.value &&
    githubConnection.isConnected.value &&
    !githubConnection.loading.value &&
    !githubConnection.requestError.value,
);
const canLoadAvailableGitHubOrganizations = computed(
  () => canAddGitHubOrganization.value,
);
const workspaceGitHubOrganizations = useAdminWorkspaceGitHubOrganizations({
  availableOrganizationsEnabled: canLoadAvailableGitHubOrganizations,
  enabled: isAuthenticated,
  githubAppInstallUrl: appEnv.githubAppInstallUrl,
  onError(message, error, action) {
    errorToast(message, {
      error,
      logContext: { action, feature: 'settings-github-workspace-access' },
    });
  },
  onSuccess(message) {
    successToast(message);
  },
  scope,
  userAppUrl: appEnv.userAppUrl,
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
const githubProfileHref = computed(() => buildGitHubProfileHref(appEnv.userAppUrl));
const gitHubAddGateMessage = computed(() => {
  if (githubConnection.loading.value) {
    return 'Confirming your GitHub account connection before organization setup.';
  }

  if (githubConnection.requestError.value) {
    return 'Reload your GitHub account status before adding workspace organizations.';
  }

  if (!githubConnection.isConnected.value) {
    return 'Connect your GitHub account before adding workspace organizations.';
  }

  return null;
});

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
      <div
        v-if="requestError && !loading"
        class="max-w-[620px]"
      >
        <RequestErrorCard
          title="Failed to load settings"
          :message="requestError"
          @retry="retryLoadSettings"
        />
      </div>

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
      >
        <template #after-card>
          <SettingsGitHubAccountCard
            :connection="githubConnection.connection.value"
            :is-initial-loading="githubConnection.isInitialLoading.value"
            :profile-href="githubProfileHref"
            :request-error="githubConnection.requestError.value"
            @retry="githubConnection.retryLoad"
          />

          <SettingsGitHubWorkspaceAccessCard
            v-model:selected-organization="workspaceGitHubOrganizations.selectedOrganization.value"
            :add-organization-gate-message="gitHubAddGateMessage"
            :adding="workspaceGitHubOrganizations.adding.value"
            :available-organization-empty-message="workspaceGitHubOrganizations.availableOrganizationsEmptyMessage.value"
            :available-organizations="workspaceGitHubOrganizations.selectableOrganizations.value"
            :available-organizations-initial-loading="workspaceGitHubOrganizations.availableOrganizationsInitialLoading.value"
            :available-organizations-loading="workspaceGitHubOrganizations.availableOrganizationsLoading.value"
            :available-organizations-request-error="workspaceGitHubOrganizations.availableOrganizationsRequestError.value"
            :can-add-organization="canAddGitHubOrganization"
            :is-initial-loading="workspaceGitHubOrganizations.isInitialLoading.value"
            :items="workspaceGitHubOrganizations.items.value"
            :organization-login-error="workspaceGitHubOrganizations.organizationLoginError.value"
            :recovery-checklist="workspaceGitHubOrganizations.recoveryChecklist.value"
            :removing-organization-id="workspaceGitHubOrganizations.removingOrganizationId.value"
            :request-error="workspaceGitHubOrganizations.requestError.value"
            @add="workspaceGitHubOrganizations.addOrganization"
            @remove="workspaceGitHubOrganizations.removeOrganization"
            @retry="workspaceGitHubOrganizations.retryLoad"
            @retry-add="workspaceGitHubOrganizations.addOrganization"
            @retry-available-organizations="workspaceGitHubOrganizations.retryAvailableOrganizations"
          />
        </template>
      </SettingsForm>
    </template>
  </div>
</template>
