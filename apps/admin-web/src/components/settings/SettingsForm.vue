<script setup lang="ts">
import { computed } from 'vue';
import { SurfaceCard } from '@gitiempo/web-shared';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';

import type { AdminSettingsFieldErrors } from '@/composables/settings/admin-settings-form';

interface CurrencyOption {
	label: string;
	value: string;
}

interface FutureSettingsField {
	id: string;
	label: string;
	value: string;
}

interface FutureSettingsSection {
	fields: FutureSettingsField[];
	title: string;
}

const workspaceName = defineModel<string>('workspaceName', { required: true });
const defaultHourlyRate = defineModel<number | null>('defaultHourlyRate', {
	required: true,
});
const currency = defineModel<string>('currency', { required: true });

const props = defineProps<{
	canSave: boolean;
	currencyOptions: readonly CurrencyOption[];
	fieldErrors: AdminSettingsFieldErrors;
	isDirty: boolean;
	saving: boolean;
}>();

const selectCurrencyOptions = computed(() => [...props.currencyOptions]);

const futureSettingsSections: FutureSettingsSection[] = [
	{
		fields: [
			{
				id: 'settings-invoice-prefix',
				label: 'Invoice prefix',
				value: 'INV-2026',
			},
			{
				id: 'settings-payment-terms',
				label: 'Payment terms',
				value: 'Net 30',
			},
		],
		title: 'Billing Defaults',
	},
	{
		fields: [
			{
				id: 'settings-legal-entity',
				label: 'Legal entity',
				value: 'GiTiempo LLC',
			},
			{
				id: 'settings-tax-id',
				label: 'Tax ID',
				value: '98-7654321',
			},
		],
		title: 'Organization',
	},
];

const emit = defineEmits<{
	cancel: [];
	save: [];
}>();
</script>

<template>
  <form
    class="flex w-full max-w-[620px] flex-col gap-2"
    @submit.prevent="emit('save')"
  >
    <SurfaceCard
      class="w-full"
      padding-class="p-5"
    >
      <div class="flex flex-col gap-5">
        <section class="flex flex-col gap-3">
          <h2 class="text-text-dark text-lg font-semibold">
            Workspace
          </h2>

          <div class="flex flex-col gap-1.5">
            <label
              for="settings-workspace-name"
              class="text-text-dark text-[13px] font-medium"
            >
              Workspace name
            </label>
            <InputText
              id="settings-workspace-name"
              v-model="workspaceName"
              autocomplete="organization"
              class="h-[38px] w-full"
              :invalid="!!fieldErrors.workspaceName"
            />
            <Message
              v-if="fieldErrors.workspaceName"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ fieldErrors.workspaceName }}
            </Message>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <label
                for="settings-default-hourly-rate"
                class="text-text-dark text-[13px] font-medium"
              >
                Default hourly rate
              </label>
              <InputNumber
                v-model="defaultHourlyRate"
                input-id="settings-default-hourly-rate"
                :min="0"
                :min-fraction-digits="0"
                :max-fraction-digits="2"
                :allow-empty="true"
                :invalid="!!fieldErrors.defaultHourlyRate"
                class="w-full"
                input-class="h-[38px] w-full"
                fluid
              />
              <Message
                v-if="fieldErrors.defaultHourlyRate"
                severity="error"
                size="small"
                variant="simple"
              >
                {{ fieldErrors.defaultHourlyRate }}
              </Message>
            </div>

            <div class="flex w-full flex-col gap-1.5 sm:w-40">
              <label
                for="settings-currency"
                class="text-text-dark text-[13px] font-medium"
              >
                Currency
              </label>
              <Select
                v-model="currency"
                input-id="settings-currency"
                :options="selectCurrencyOptions"
                option-label="label"
                option-value="value"
                :invalid="!!fieldErrors.currency"
                class="h-[38px] w-full"
              />
              <Message
                v-if="fieldErrors.currency"
                severity="error"
                size="small"
                variant="simple"
              >
                {{ fieldErrors.currency }}
              </Message>
            </div>
          </div>
        </section>

        <template
          v-for="section in futureSettingsSections"
          :key="section.title"
        >
          <div class="border-divider border-t" />

          <section class="flex flex-col gap-3">
            <h2 class="text-text-dark text-lg font-semibold">
              {{ section.title }}
            </h2>

            <div
              v-for="field in section.fields"
              :key="field.id"
              class="flex flex-col gap-1.5"
            >
              <label
                :for="field.id"
                class="text-text-dark text-[13px] font-medium"
              >
                {{ field.label }}
              </label>
              <InputText
                :id="field.id"
                :model-value="field.value"
                class="h-[38px] w-full"
                disabled
              />
            </div>
          </section>
        </template>
      </div>
    </SurfaceCard>

    <div
      class="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end"
    >
      <Button
        label="Cancel"
        severity="secondary"
        outlined
        type="button"
        :disabled="saving || !isDirty"
        :pt="{ root: { class: 'bg-surface min-h-11' } }"
        @click="emit('cancel')"
      />
      <Button
        label="Save Settings"
        type="submit"
        :disabled="!canSave"
        :loading="saving"
        :pt="{ root: { class: 'min-h-11' } }"
        @click.prevent="emit('save')"
      />
    </div>
  </form>
</template>
