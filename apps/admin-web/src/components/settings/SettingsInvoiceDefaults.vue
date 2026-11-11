<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue';
import { useUpdateWorkspaceSettingsMutation } from '@/composables/query';
import type { AdminServerStateScope } from '@/lib/query-keys';
import { invoiceBillingProfileSchema, type InvoiceBillingProfile } from '@gitiempo/shared';
import Button from 'primevue/button';
import FileUpload, { type FileUploadUploaderEvent } from 'primevue/fileupload';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Message from 'primevue/message';

import { getAdminSettingsClient } from '@/services/admin-settings-client';
import SettingsCard from './SettingsCard.vue';

const props = defineProps<{ profile?: InvoiceBillingProfile | null; scope: AdminServerStateScope }>();
const scope = computed(() => props.scope);
const saveMutation = useUpdateWorkspaceSettingsMutation({ client: getAdminSettingsClient(), scope });
function emptyProfile(): InvoiceBillingProfile {
  return {
    sender: { name: '', address: '', email: '', taxId: '' },
    payment: { method: '', terms: '', beneficiary: '', provider: '', account: '', instructions: '' },
    invoicePrefix: 'INV',
    logo: null,
  };
}
const draft = ref(emptyProfile());
const saved = ref('');
const saving = ref(false);
const error = ref('');
const fieldErrors = ref<Record<string, string>>({});
let generation = 0;
let logoRead = 0;
const dirty = computed(() => JSON.stringify(draft.value) !== saved.value);
const senderFields = [
  { key: 'name', label: 'Legal / sender name' },
  { key: 'address', label: 'Billing address' },
  { key: 'email', label: 'Billing email' },
  { key: 'taxId', label: 'Tax ID (optional)' },
] as const;
const paymentMethods = computed(() => [...new Set(['Bank transfer', 'Card', 'Other', draft.value.payment.method].filter(Boolean))]);
const paymentFields = [
  { key: 'method', label: 'Payment method' },
  { key: 'terms', label: 'Payment terms' },
  { key: 'beneficiary', label: 'Beneficiary' },
  { key: 'provider', label: 'Bank / payment provider' },
  { key: 'account', label: 'Account / payment details' },
  { key: 'instructions', label: 'Payment instructions' },
] as const;

watch(() => props.profile, (profile) => {
  if (dirty.value && saved.value) return;
  draft.value = structuredClone(toRaw(profile ?? emptyProfile()));
  saved.value = JSON.stringify(draft.value);
}, { immediate: true });
watch(() => JSON.stringify(props.scope), () => {
  generation++;
  logoRead++;
  saving.value = false;
  draft.value = structuredClone(toRaw(props.profile ?? emptyProfile()));
  saved.value = JSON.stringify(draft.value);
  error.value = '';
  fieldErrors.value = {};
});

async function readLogo(event: FileUploadUploaderEvent): Promise<void> {
  const file = Array.isArray(event.files) ? event.files[0] : event.files;
  if (!file) return;
  error.value = '';
  const read = ++logoRead;
  try {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read the logo. Select the file again.'));
      reader.readAsDataURL(file);
    });
    if (read !== logoRead) return;
    const result = invoiceBillingProfileSchema.safeParse({ ...draft.value, logo: data });
    if (!result.success) {
      error.value = result.error.issues.map((issue) => issue.message).join(' ');
      return;
    }
    draft.value.logo = data;
  } catch (cause) {
    if (read === logoRead) error.value = cause instanceof Error ? cause.message : 'Could not read the logo.';
  }
}

async function save(): Promise<void> {
  const result = invoiceBillingProfileSchema.safeParse(draft.value);
  fieldErrors.value = {};
  error.value = '';
  if (!result.success) {
    for (const issue of result.error.issues) {
      fieldErrors.value[issue.path.join('.')] = issue.message;
    }
    return;
  }
  const requestGeneration = generation;
  const submitted = JSON.stringify(draft.value);
  saving.value = true;
  try {
    const response = await saveMutation.mutateAsync({ billingProfile: result.data });
    if (requestGeneration !== generation) return;
    saved.value = JSON.stringify(response.billingProfile ?? result.data);
    if (JSON.stringify(draft.value) === submitted) {
      draft.value = structuredClone(toRaw(response.billingProfile ?? result.data));
    }
  } catch (cause) {
    if (requestGeneration === generation) {
      error.value = cause instanceof Error ? cause.message : 'Could not save invoice defaults. Try again.';
    }
  } finally {
    if (requestGeneration === generation) saving.value = false;
  }
}
</script>

<template>
  <SettingsCard
    title="Invoice sender"
    description="Default details for new invoices. Existing invoices keep their saved details."
  >
    <form
      class="flex flex-col gap-5"
      @submit.prevent="save"
    >
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          v-for="field in senderFields"
          :key="field.key"
          class="flex flex-col gap-1.5"
          :class="{ 'sm:col-span-2': field.key === 'name' || field.key === 'address' }"
        >
          <label
            :for="`invoice-sender-${field.key}`"
            class="text-text-dark text-[13px] font-medium"
          >{{ field.label }}</label>
          <InputText
            :id="`invoice-sender-${field.key}`"
            v-model="draft.sender[field.key]"
            :disabled="saving"
            :invalid="Boolean(fieldErrors[`sender.${field.key}`])"
            class="w-full"
          />
          <Message
            v-if="fieldErrors[`sender.${field.key}`]"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ fieldErrors[`sender.${field.key}`] }}
          </Message>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <img
          v-if="draft.logo"
          :src="draft.logo"
          alt="Invoice logo"
          class="h-14 w-14 rounded-lg object-contain"
        >
        <div class="flex flex-col gap-2">
          <span class="text-text-dark text-[13px] font-medium">Logo (optional)</span>
          <span class="text-text-muted text-xs">PNG or SVG · shown on PDF</span>
          <div class="flex flex-wrap gap-2">
            <FileUpload
              mode="basic"
              custom-upload
              auto
              accept="image/png,image/svg+xml"
              :max-file-size="256000"
              choose-label="Upload logo"
              :disabled="saving"
              @uploader="readLogo"
            />
            <Button
              v-if="draft.logo"
              label="Remove logo"
              severity="secondary"
              outlined
              :disabled="saving"
              @click="logoRead++; draft.logo = null"
            />
          </div>
        </div>
      </div>
      <div class="border-divider border-t pt-5">
        <h2 class="text-text-dark text-lg font-semibold">
          Payment defaults
        </h2>
      </div>
      <div class="flex flex-col gap-5">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            v-for="field in paymentFields.slice(0, 2)"
            :key="field.key"
            class="flex flex-col gap-1.5"
          >
            <label
              :for="`invoice-payment-${field.key}`"
              class="text-text-dark text-[13px] font-medium"
            >{{ field.label }}</label>
            <Select
              v-if="field.key === 'method'"
              v-model="draft.payment.method"
              input-id="invoice-payment-method"
              :options="paymentMethods"
              editable
              :disabled="saving"
              :invalid="Boolean(fieldErrors['payment.method'])"
              class="w-full"
            />
            <InputText
              v-else
              :id="`invoice-payment-${field.key}`"
              v-model="draft.payment[field.key]"
              :disabled="saving"
              :invalid="Boolean(fieldErrors[`payment.${field.key}`])"
              class="w-full"
            />
            <Message
              v-if="fieldErrors[`payment.${field.key}`]"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ fieldErrors[`payment.${field.key}`] }}
            </Message>
          </div>
        </div>
        <div class="order-first flex flex-col gap-1.5 sm:order-none">
          <label
            for="invoice-prefix"
            class="text-text-dark text-[13px] font-medium"
          >Invoice prefix</label>
          <InputText
            id="invoice-prefix"
            v-model="draft.invoicePrefix"
            :disabled="saving"
            :invalid="Boolean(fieldErrors.invoicePrefix)"
          />
          <Message
            v-if="fieldErrors.invoicePrefix"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ fieldErrors.invoicePrefix }}
          </Message>
        </div>
        <div
          v-for="field in paymentFields.slice(2)"
          :key="field.key"
          class="flex flex-col gap-1.5"
        >
          <label
            :for="`invoice-payment-${field.key}`"
            class="text-text-dark text-[13px] font-medium"
          >{{ field.label }}</label>
          <Textarea
            v-if="field.key === 'instructions'"
            :id="`invoice-payment-${field.key}`"
            v-model="draft.payment[field.key]"
            :disabled="saving"
            rows="3"
            class="w-full"
          />
          <InputText
            v-else
            :id="`invoice-payment-${field.key}`"
            v-model="draft.payment[field.key]"
            :disabled="saving"
            class="w-full"
          />
          <Message
            v-if="fieldErrors[`payment.${field.key}`]"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ fieldErrors[`payment.${field.key}`] }}
          </Message>
        </div>
      </div>
      <Message
        v-if="error"
        severity="error"
      >
        {{ error }}
      </Message>
      <div class="flex justify-end">
        <Button
          type="submit"
          label="Save invoice defaults"
          :loading="saving"
          :disabled="!dirty || saving"
          class="w-full sm:w-auto"
        />
      </div>
    </form>
  </SettingsCard>
</template>
