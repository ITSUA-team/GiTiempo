<script setup lang="ts">
import { useIsMobileViewport } from '@gitiempo/web-shared';
import { computed, ref, toRaw, watch } from 'vue';
import { useUpdateWorkspaceSettingsMutation } from '@/composables/query';
import type { AdminServerStateScope } from '@/lib/query-keys';
import { invoiceBillingProfileSchema, invoiceLogoSchema, type InvoiceBillingProfile } from '@gitiempo/shared';
import Button from 'primevue/button';
import FileUpload, { type FileUploadUploaderEvent } from 'primevue/fileupload';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Message from 'primevue/message';

import { getAdminSettingsClient } from '@/services/admin-settings-client';
import SettingsCard from './SettingsCard.vue';

const props = defineProps<{ profile?: InvoiceBillingProfile | null; scope: AdminServerStateScope }>();
const isMobile = useIsMobileViewport();
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
const readingLogo = ref(false);
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
  readingLogo.value = false;
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
  readingLogo.value = true;
  try {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read the logo. Select the file again.'));
      reader.readAsDataURL(file);
    });
    if (read !== logoRead) return;
    const result = invoiceLogoSchema.safeParse(data);
    if (!result.success) {
      error.value = result.error.issues.map((issue) => issue.message).join(' ');
      return;
    }
    draft.value.logo = result.data;
  } catch (cause) {
    if (read === logoRead) error.value = cause instanceof Error ? cause.message : 'Could not read the logo.';
  } finally {
    if (read === logoRead) readingLogo.value = false;
  }
}

function removeLogo(): void {
  logoRead++;
  readingLogo.value = false;
  draft.value.logo = null;
}

async function save(): Promise<void> {
  if (readingLogo.value || saving.value) return;
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
    class="invoice-defaults"
    padding-class="p-0 sm:p-5"
    description-class="text-xs"
    description="Default details for new invoices. Existing invoices keep their saved details."
  >
    <form
      class="flex flex-col gap-4"
      :aria-busy="readingLogo || saving"
      @submit.prevent="save"
    >
      <div class="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
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
          <Textarea
            v-if="field.key === 'address'"
            :id="`invoice-sender-${field.key}`"
            v-model="draft.sender.address"
            :disabled="saving"
            :invalid="Boolean(fieldErrors['sender.address'])"
            rows="2"
            class="h-[70px] w-full"
          />
          <InputText
            v-else
            :id="`invoice-sender-${field.key}`"
            v-model="draft.sender[field.key]"
            :disabled="saving"
            :invalid="Boolean(fieldErrors[`sender.${field.key}`])"
            class="h-[38px] w-full"
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
      <div class="border-divider bg-surface-primary grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border p-3 sm:flex sm:border-0 sm:p-0">
        <img
          v-if="draft.logo"
          :src="draft.logo"
          alt="Invoice logo"
          class="h-12 w-12 rounded-lg object-contain"
        >
        <div class="flex min-w-0 flex-col gap-1 sm:flex-1" :class="{'col-span-2': !draft.logo}">
          <span class="text-text-dark text-[13px] font-medium">Logo (optional)</span>
          <span class="text-text-muted hidden text-xs sm:block">PNG or SVG · shown on PDF</span>
        </div>
        <div class="order-last col-span-full sm:order-none">
          <FileUpload
            mode="basic"
            custom-upload
            auto
            accept="image/png,image/svg+xml"
            :max-file-size="256000"
            choose-label="Upload logo"
            choose-icon="pi pi-upload"
            :pt="{ basicContent: { class: 'w-full' } }"
            :choose-button-props="{ severity: 'secondary', outlined: true, class: 'h-[38px] w-full sm:w-auto' }"
            :disabled="saving"
            @uploader="readLogo"
          />
        </div>
        <Button
          v-if="draft.logo"
          aria-label="Remove logo"
          severity="danger"
          outlined
          class="h-[38px] sm:w-[38px]"
          :disabled="saving"
          @click="removeLogo"
        >
          <span v-if="isMobile">Remove</span>
          <i v-else class="pi pi-trash" aria-hidden="true" />
        </Button>
      </div>
      <div class="border-divider border-t pt-4">
        <h2 class="text-text-dark text-lg font-semibold">
          Payment defaults
        </h2>
      </div>
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
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
              class="h-[38px] w-full"
            />
            <InputText
              v-else
              :id="`invoice-payment-${field.key}`"
              v-model="draft.payment[field.key]"
              :disabled="saving"
              :invalid="Boolean(fieldErrors[`payment.${field.key}`])"
              class="h-[38px] w-full"
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
            class="h-[38px] w-full"
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
            v-if="field.key === 'instructions' || field.key === 'account'"
            :id="`invoice-payment-${field.key}`"
            v-model="draft.payment[field.key]"
            :disabled="saving"
            :rows="field.key === 'account' && !isMobile ? 1 : 2"
            class="w-full"
            :class="field.key === 'account' ? 'h-[70px] sm:h-[38px]' : 'h-[70px]'"
          />
          <InputText
            v-else
            :id="`invoice-payment-${field.key}`"
            v-model="draft.payment[field.key]"
            :disabled="saving"
            class="h-[38px] w-full"
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
          :disabled="!dirty || saving || readingLogo"
          class="h-[38px] w-full sm:w-auto"
        />
      </div>
    </form>
  </SettingsCard>
</template>

<style scoped>
@media (width < 640px) {
  .invoice-defaults {
    background: transparent;
    box-shadow: none;
    border-radius: 0;
  }
}
</style>
