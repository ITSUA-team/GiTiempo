<script setup lang="ts">
import { onMounted } from 'vue';
import { SurfaceCard } from '@gitiempo/web-shared';
import Button from 'primevue/button';

import SettingsForm from '@/components/settings/SettingsForm.vue';
import SettingsPageSkeleton from '@/components/settings/SettingsPageSkeleton.vue';
import { useAdminSettingsPage } from '@/composables/useAdminSettingsPage';

const {
	canSave,
	currencyOptions,
	fieldErrors,
	form,
	initialLoaded,
	isDirty,
	loadSettings,
	loading,
	requestError,
	resetForm,
	retryLoad,
	saveSettings,
	saving,
} = useAdminSettingsPage();

onMounted(() => {
	void loadSettings();
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <SettingsPageSkeleton v-if="loading && !initialLoaded" />

    <template v-else>
      <header class="flex flex-col gap-1.5">
        <h1 class="text-text-dark text-[28px] font-semibold">
          Settings
        </h1>
        <p class="text-text-muted text-sm font-normal">
          Configure workspace defaults, billing preferences, and organization
          details.
        </p>
      </header>

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
            @click="retryLoad"
          />
        </div>
      </SurfaceCard>

      <SettingsForm
        v-else
        v-model:workspace-name="form.workspaceName"
        v-model:default-hourly-rate="form.defaultHourlyRate"
        v-model:currency="form.currency"
        :can-save="canSave"
        :currency-options="currencyOptions"
        :field-errors="fieldErrors"
        :is-dirty="isDirty"
        :saving="saving"
        @cancel="resetForm"
        @save="saveSettings"
      />
    </template>
  </div>
</template>