<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue';
import type {
  PreviewInvoiceResponse,
  CreateInvoiceInput,
  EligibleEntriesQuery,
  InvoiceResponse,
} from '@gitiempo/shared';
import {
  AppDialog,
  DatePickerButtonBar,
  useDatePickerConfirmCancel,
} from '@gitiempo/web-shared';
import {
  formatLocalCalendarDate,
  getLocalDateKey,
} from '@gitiempo/web-shared/time';
import {
  giTiempoDatePickerPt,
  giTiempoFieldWidthSelectPt,
} from '@gitiempo/web-config/theme';
import { ChevronRightIcon } from '@heroicons/vue/24/outline';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';

import Checkbox from 'primevue/checkbox';
import FileUpload from 'primevue/fileupload';
import { adminInvoicesClient } from '@/services/admin-invoices-client';
import { useEligibleEntriesPreview } from '@/composables/invoices/useEligibleEntriesPreview';
import { getSettingsCurrencyOptions } from '@/lib/currencies';
import { formatCurrency } from '@/lib/format-currency';
import { formatDuration } from '@/lib/format-duration';
import type { AdminServerStateScope } from '@/lib/query-keys';
import { getRoundingStepOptions } from '@/lib/rounding-step-options';

/**
 * Presentational create-invoice dialog for the admin invoices list page.
 * Owns form state and the eligible-entries preview; error toasts, list
 * refresh, and mutation lifecycle stay with the parent view via the
 * `created` and `update:visible` emits.
 */

interface InvoiceCreateMutation {
  createInvoice: (input: CreateInvoiceInput) => Promise<InvoiceResponse>;
  isCreating: Ref<boolean>;
}

const props = defineProps<{
  visible: boolean;
  source?: InvoiceResponse;
  editing?: boolean;
  groupId?: string | null;
  /** Admin may submit without a project (workspace-wide); PM must select one. */
  isAdmin: boolean;
  projects: Array<{
    id: string;
    name: string;
    timeRoundingStepMinutes: number | null;
  }>;
  /** Currency selected in workspace Settings; pre-selected on dialog open. */
  workspaceCurrency: string | null;
  /** Hourly rate from workspace Settings; pre-filled on dialog open. */
  workspaceHourlyRate: number | null;
  /** Rounding step from workspace Settings; resolves project "inherit" values. */
  workspaceRoundingStepMinutes: number | null;
  revisionConflict?: boolean;
  reviewRevision?: () => Promise<void>;
  scope: AdminServerStateScope;
  createMutation: InvoiceCreateMutation;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  created: [invoice: InvoiceResponse];
}>();

const WORKSPACE_WIDE_PROJECT_VALUE = '';

const ROUNDING_STEP_OPTIONS = getRoundingStepOptions();

const sender = ref({name:'',address:'',email:'',taxId:''});
const recipient = ref({name:'',address:'',email:'',taxId:''});
const payment = ref({method:'',terms:'',beneficiary:'',provider:'',account:'',instructions:''});
const services = ref('');
const logo = ref<string | null>(null);
const selectedEntries = ref<string[]>([]);
const selectionInitialized = ref(false);
const saveError = ref('');
const calculatedPreview = ref<PreviewInvoiceResponse | null>(null);
const calculating = ref(false);
const calculationFailed = ref(false);
let calculationGeneration = 0;
let lifecycleGeneration = 0;
let logoReadGeneration = 0;
const group = ref<string | null>(null);
const groupOptions = ref<Array<{id:string | null;name:string}>>([{id:null,name:'Ungrouped'}]);
async function loadGroups() {
 const generation = lifecycleGeneration;
 let result;
 try {result = await adminInvoicesClient.listGroups();}
 catch {if (generation === lifecycleGeneration && props.visible) saveError.value='Could not load groups. Retry opening the dialog.';return;}
 if (generation !== lifecycleGeneration || !props.visible) return;
 groupOptions.value=[{id:null,name:'Ungrouped'},...result.groups];
}
function uploadLogo(event: {files: File | File[]}) {
 const file = Array.isArray(event.files) ? event.files[0] : event.files;
 if (!file) return;
 if (file.size > 256000 || !['image/png','image/svg+xml'].includes(file.type)) {
   saveError.value = 'Choose a PNG or SVG logo up to 250 KB.';return;
 }
 const generation = lifecycleGeneration;
 const readGeneration=++logoReadGeneration;
 const reader = new FileReader();
 reader.onload = () => {if (generation === lifecycleGeneration && readGeneration === logoReadGeneration && props.visible) logo.value=String(reader.result);};
 reader.onerror = () => {if(generation === lifecycleGeneration && readGeneration === logoReadGeneration && props.visible) saveError.value='Could not read the logo. Choose the file again.';};
 reader.readAsDataURL(file);
}
async function useSettings(preserveEdits=false) {
  const generation = lifecycleGeneration;
  const initialSender=JSON.stringify(sender.value);
  const initialPayment=JSON.stringify(payment.value);
  const initialLogo=logo.value;
  const initialLogoRead=logoReadGeneration;
  let defaults;
  try {defaults = await adminInvoicesClient.getInvoiceDefaults();}
  catch {if(generation === lifecycleGeneration && props.visible) saveError.value='Could not load billing settings. Try again.';return;}
  if (generation === lifecycleGeneration && props.visible && defaults.billingProfile) {
    if(!preserveEdits || JSON.stringify(sender.value)===initialSender) sender.value = {...defaults.billingProfile.sender};
    if(!preserveEdits || JSON.stringify(payment.value)===initialPayment) payment.value = {...defaults.billingProfile.payment};
    if(!preserveEdits || (logo.value===initialLogo && logoReadGeneration===initialLogoRead)) logo.value = defaults.billingProfile.logo;
  }
}
const title = ref('');
const selectedProjectId = ref<string | null>(null);
const dateRange = ref<Date[] | null>(null);
const datePicker = useDatePickerConfirmCancel<Date[] | null>();
const hourlyRate = ref<number | null>(null);
const currency = ref('');
const discountPercent = ref<number | null>(0);
const roundingStepMinutes = ref<number>(1);
const notes = ref('');

const rateTouched = ref(false);
const currencyTouched = ref(false);
const roundingStepTouched = ref(false);
const validationTriggered = ref(false);
const previewExpanded = ref(false);
const workspaceRateKnown = ref(false);
const workspaceCurrencyKnown = ref(false);

const previewQuery = computed<EligibleEntriesQuery | null>(() => {
  const dates = dateRange.value;
  if (!dates?.[0] || !dates[1]) return null;
  if (!props.isAdmin && !selectedProjectId.value) return null;
  return {
    dateFrom: getLocalDateKey(dates[0]),
    dateTo: getLocalDateKey(dates[1]),
    invoiceId: props.editing ? props.source?.id : undefined,
    projectId: selectedProjectId.value || undefined,
    ...(roundingStepTouched.value
      ? { roundingStepMinutes: roundingStepMinutes.value }
      : {}),
  };
});

const {
  preview,
  refetch: refreshEligibility,
  isLoading: previewLoading,
  isEmpty: previewEmpty,
  isError: previewError,
  hasEntries,
} = useEligibleEntriesPreview({
  enabled: computed(() => props.visible),
  scope: computed(() => props.scope),
  query: previewQuery,
});

watch(preview, (value) => {
  if (!value) return;
  if (!props.editing && !selectionInitialized.value) {selectedEntries.value = value.entries.map(e=>e.id);selectionInitialized.value=true;}
});
// Reset on any visibility change, before the pre-fill watcher below so a
// reopened dialog starts blank and then receives the preview defaults again.
watch(
  [() => props.visible, () => props.scope],
  () => {
    lifecycleGeneration++;
    calculationGeneration++;
    calculatedPreview.value = null;
    calculating.value = false;
    logo.value = null;
    rateTouched.value = false;
    currencyTouched.value = false;
    roundingStepTouched.value = false;
    title.value = '';
    selectedProjectId.value = null;
    dateRange.value = null;
    hourlyRate.value = null;
    currency.value = '';
    discountPercent.value = 0;
    roundingStepMinutes.value = 1;
    notes.value = '';
    saveError.value = '';
    calculationFailed.value=false;
    selectedEntries.value = [];
    selectionInitialized.value = false;
    sender.value = {name:'',address:'',email:'',taxId:''};
    recipient.value = {name:'',address:'',email:'',taxId:''};
    payment.value = {method:'',terms:'',beneficiary:'',provider:'',account:'',instructions:''};
    services.value = '';
    if (props.visible) {
      group.value = props.source?.groupId ?? props.groupId ?? null;
      void loadGroups();
      const source = props.source;
      if (source) {
        rateTouched.value = true;
        currencyTouched.value = true;
        title.value = source.title;
        selectedProjectId.value = source.projectId;
        dateRange.value = [new Date(source.dateFrom+'T12:00:00'),new Date(source.dateTo+'T12:00:00')];
        hourlyRate.value = source.hourlyRate;
        currency.value = source.currency;
        discountPercent.value = source.discountPercent;
        roundingStepMinutes.value = source.roundingStepMinutes;
        roundingStepTouched.value = true;
        services.value = source.services ?? '';
        if (source.sender) sender.value = {...source.sender};
        if (source.recipient) recipient.value = {...source.recipient};
        if (source.payment) payment.value = {...source.payment, instructions: !props.editing && source.reference ? source.payment.instructions.replaceAll(source.reference, '{{invoiceReference}}') : source.payment.instructions};
        logo.value = source.logo ?? null;
        notes.value = source.notes ?? '';
        selectedEntries.value = props.editing ? source.timeEntries.map(e=>e.id) : [];
      } else {
        const generation = lifecycleGeneration;
        void useSettings(true).catch(() => {if (generation === lifecycleGeneration && props.visible) saveError.value = 'Could not load invoice defaults. Retry Use settings.';});
      }
    }

    validationTriggered.value = false;
    previewExpanded.value = false;
    workspaceRateKnown.value = false;
    workspaceCurrencyKnown.value = false;
  },
  {immediate:true},
);

// Pre-fill the workspace Settings hourly rate as soon as the dialog opens, and
// keep following it while the settings load late or change while open — until
// the user edits the field. The workspaceRateKnown flag distinguishes "settings
// not yet loaded" (preview default fills in) from "rate explicitly cleared"
// (field stays empty so the create request does not send a stale auto-fill).
watch(
  [() => props.workspaceHourlyRate, () => props.visible],
  ([workspaceHourlyRate, visible]) => {
    if (!visible || rateTouched.value) return;
    if (workspaceHourlyRate !== null) {
      workspaceRateKnown.value = true;
      hourlyRate.value = workspaceHourlyRate;
    } else if (workspaceRateKnown.value) {
      hourlyRate.value = null;
    }
  },
  { immediate: true },
);

// Pre-select the workspace Settings currency as soon as the dialog opens, and
// keep following it while the settings load late or change while open — until
// the user edits the field. The workspaceCurrencyKnown flag distinguishes
// "settings not yet loaded" (preview default fills in) from "currency
// explicitly cleared" (field stays empty so the create request does not send
// a stale auto-fill).
watch(
  [() => props.workspaceCurrency, () => props.visible],
  ([workspaceCurrency, visible]) => {
    if (!visible || currencyTouched.value) return;
    if (workspaceCurrency) {
      workspaceCurrencyKnown.value = true;
      currency.value = workspaceCurrency;
    } else if (workspaceCurrencyKnown.value) {
      currency.value = '';
    }
  },
  { immediate: true },
);

// Sync rate/currency/rounding defaults from every fresh preview response
// until the user edits those fields; after a manual change the entered
// values win. Relying on the touched flags (instead of also checking the
// field is empty) keeps the dialog in sync when workspace settings change
// between opens even if vue-query serves a cached preview response first.
watch(
  [preview, () => props.visible],
  ([data, visible]) => {
    if (!visible || !data) return;
    // The workspace settings rate always wins over the preview value; the
    // preview default is only the fallback for when the settings query has
    // not yet provided a rate. Once a rate was known and then cleared, the
    // field stays empty rather than silently re-filling from the preview.
    if (
      !rateTouched.value &&
      props.workspaceHourlyRate === null &&
      !workspaceRateKnown.value &&
      data.defaultHourlyRate !== null
    ) {
      hourlyRate.value = data.defaultHourlyRate;
    }
    // The workspace settings currency always wins over the preview value; the
    // preview default is only the fallback for when the settings query has
    // not yet provided a currency. Once a currency was known and then cleared,
    // the field stays empty rather than silently re-filling from the preview.
    if (
      !currencyTouched.value &&
      !props.workspaceCurrency &&
      !workspaceCurrencyKnown.value &&
      data.defaultCurrency !== null
    ) {
      currency.value = data.defaultCurrency;
    }
    if (!roundingStepTouched.value) {
      roundingStepMinutes.value = data.defaultRoundingStepMinutes;
    }
  },
  { immediate: true },
);

// When a project is selected, immediately update the rounding step from the
// project's configured value (or the workspace default when the project
// inherits) so the field reflects the selection without waiting for the
// preview response. The preview sync above still reconciles afterwards.
watch(selectedProjectId, (newProjectId) => {
  if (roundingStepTouched.value) return;

  if (!newProjectId || newProjectId === WORKSPACE_WIDE_PROJECT_VALUE) {
    if (props.workspaceRoundingStepMinutes !== null) {
      roundingStepMinutes.value = props.workspaceRoundingStepMinutes;
    }
    return;
  }

  const project = props.projects.find((p) => p.id === newProjectId);
  if (!project) return;

  if (project.timeRoundingStepMinutes !== null) {
    roundingStepMinutes.value = project.timeRoundingStepMinutes;
  } else if (props.workspaceRoundingStepMinutes !== null) {
    roundingStepMinutes.value = props.workspaceRoundingStepMinutes;
  }
});

const isCreating = computed(() => props.createMutation.isCreating.value);

const projectOptions = computed(() => {
  const options = props.projects.map((project) => ({
    id: project.id,
    name: project.name,
  }));

  if (props.isAdmin) {
    return [
      { id: WORKSPACE_WIDE_PROJECT_VALUE, name: 'Workspace-wide (no project)' },
      ...options,
    ];
  }

  return options;
});

const currencyOptions = computed(() =>
  getSettingsCurrencyOptions(props.workspaceCurrency),
);

const hasTitle = computed(() => title.value.trim().length > 0);
const hasDateRange = computed(() => {
  const dates = dateRange.value;
  return Boolean(dates?.[0] && dates[1]);
});

const titleError = computed(
  () => validationTriggered.value && !hasTitle.value,
);
const dateRangeError = computed(
  () => validationTriggered.value && !hasDateRange.value,
);
const projectError = computed(
  () =>
    validationTriggered.value && !props.isAdmin && !selectedProjectId.value,
);

const canSubmit = computed(
  () =>
    hasTitle.value &&
    hasDateRange.value &&
    (props.isAdmin || Boolean(selectedProjectId.value)),
);

const previewCurrencyCode = computed<string | null>(() => {
  const entered = currency.value.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(entered)) return entered;
  return preview.value?.defaultCurrency ?? null;
});

// Display-only estimate; the authoritative total is computed server-side.
const selectedHours = computed(() => Math.ceil((preview.value?.entries.filter(e => selectedEntries.value.includes(e.id)).reduce((sum,e)=>sum+e.roundedDurationSeconds,0) ?? 0)/36)/100);
const computedTotalAmount = computed(() => calculatedPreview.value?.totalAmount ?? null);

async function calculatePreview() {
  const query = previewQuery.value;
  if (!query || !props.visible) return;
  const generation = ++calculationGeneration;
  calculating.value = true;
  calculatedPreview.value = null;
  try {
    const result = await adminInvoicesClient.previewInvoice({...query,title:title.value || 'Preview',hourlyRate:hourlyRate.value ?? undefined,currency:currency.value || undefined,discountPercent:discountPercent.value ?? 0,roundingStepMinutes:roundingStepMinutes.value,timeEntryIds:selectedEntries.value});
    if (generation === calculationGeneration) {calculatedPreview.value = result;calculationFailed.value=false;saveError.value='';}
  } catch (error) {if (generation === calculationGeneration) {calculationFailed.value=true;saveError.value=error instanceof Error ? error.message : 'Could not calculate invoice. Retry.';}}
  finally {if (generation === calculationGeneration) calculating.value=false;}
}
watch([previewQuery,hourlyRate,currency,discountPercent,roundingStepMinutes,selectedEntries],()=>void calculatePreview(),{deep:true});
async function retryCalculation() {
 const generation=lifecycleGeneration;
 await refreshEligibility();
 if(generation===lifecycleGeneration && props.visible) await calculatePreview();
}
const previewSummary = computed<string | null>(() => {
  const data = preview.value;
  if (!data || !hasEntries.value) return null;

  const currencyCode = previewCurrencyCode.value;
  const amount = computedTotalAmount.value;
  const parts = [
    selectedEntries.value.length === 1 ? '1 entry' : `${selectedEntries.value.length} entries`,
    `${selectedHours.value}h`,
  ];

  if (currencyCode !== null && amount !== null) {
    parts.push(formatCurrency(amount, currencyCode));
  }

  return parts.join(' · ');
});

function handleRateUpdate(value: number | null): void {
  hourlyRate.value = value ?? null;
  rateTouched.value = true;
}

function handleCurrencyUpdate(value: string | undefined): void {
  currency.value = value ?? '';
  currencyTouched.value = true;
}

function handleDiscountUpdate(value: number | null): void {
  discountPercent.value = value ?? 0;
}

function handleRoundingStepUpdate(value: number | undefined): void {
  roundingStepMinutes.value = value ?? 1;
  roundingStepTouched.value = true;
}

function handleCancel(): void {
  emit('update:visible', false);
}

function handleVisibleChange(nextVisible: boolean): void {
  emit('update:visible', nextVisible);
}

async function reviewLatestRevision() {
 const generation=lifecycleGeneration;
 try {await props.reviewRevision?.();if(generation!==lifecycleGeneration || !props.visible)return;saveError.value='Latest saved revision loaded. Your edits are preserved; review them before saving.';}
 catch(error) {if(generation===lifecycleGeneration && props.visible)saveError.value=error instanceof Error ? error.message : 'Could not refresh the saved revision. Retry.';}
}

async function handleCreate(): Promise<void> {
  validationTriggered.value = true;
  if (!canSubmit.value || calculating.value || !calculatedPreview.value) return;

  const startDate = dateRange.value?.[0];
  const endDate = dateRange.value?.[1];
  if (!startDate || !endDate) return;

  const generation=lifecycleGeneration;
  try {
    const invoice = await props.createMutation.createInvoice({
      sender: sender.value, recipient: recipient.value, payment: payment.value, services: services.value,
      logo: logo.value, timeEntryIds: selectedEntries.value, groupId: group.value,
      title: title.value.trim(),
      dateFrom: getLocalDateKey(startDate),
      dateTo: getLocalDateKey(endDate),
      projectId: selectedProjectId.value || undefined,
      hourlyRate: hourlyRate.value ?? (props.editing ? preview.value?.defaultHourlyRate ?? undefined : undefined),
      currency: currency.value.trim().toUpperCase() || (props.editing ? preview.value?.defaultCurrency ?? undefined : undefined),
      discountPercent: discountPercent.value ?? 0,
      notes: notes.value.trim() || null,
      ...(roundingStepTouched.value
        ? { roundingStepMinutes: roundingStepMinutes.value }
        : {}),
    });
    if(generation!==lifecycleGeneration || !props.visible)return;
    emit('created', invoice);
    emit('update:visible', false);
  } catch (error) {
    if(generation!==lifecycleGeneration || !props.visible)return;
    void refreshEligibility();
    saveError.value = error instanceof Error ? error.message : 'Changes were not saved. Review entries and retry.';
    // The parent view owns error toasts for create failures; the dialog
    // stays open with the entered values preserved.
  }
}
</script>

<template>
  <AppDialog
    :header="editing ? 'Edit invoice' : source ? 'Create from invoice' : 'Create invoice'"
    modal
    :closable="!isCreating"
    :dismissable-mask="!isCreating"
    :pt="{ root: 'w-[min(1000px,calc(100vw-2rem))]' }"
    :visible="visible"
    @update:visible="handleVisibleChange"
  >
    <div class="flex flex-col gap-4">
      <h2 class="font-semibold">
        Invoice information
      </h2>
      <div class="flex flex-col gap-1">
        <label
          for="invoice-create-title"
          class="text-text-dark text-[13px] font-medium"
        >Title</label>
        <InputText
          id="invoice-create-title"
          v-model="title"
          maxlength="255"
          placeholder="Invoice title"
          :invalid="titleError"
          class="h-[38px] w-full"
        />
        <Message
          v-if="titleError"
          severity="error"
          size="small"
          variant="simple"
        >
          Title is required.
        </Message>
      </div>

      <div class="flex flex-col gap-2">
        <label for="invoice-group">Personal group</label><Select
          v-model="group"
          input-id="invoice-group"
          placeholder="Ungrouped"
          :options="groupOptions"
          option-label="name"
          option-value="id"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label
          for="invoice-create-project"
          class="text-text-dark text-[13px] font-medium"
        >Project</label>
        <Select
          v-model="selectedProjectId"
          input-id="invoice-create-project"
          :options="projectOptions"
          option-label="name"
          option-value="id"
          placeholder="Select a project"
          show-clear
          :invalid="projectError"
          class="w-full"
          :pt="giTiempoFieldWidthSelectPt"
        />
        <Message
          v-if="projectError"
          severity="error"
          size="small"
          variant="simple"
        >
          Select a project.
        </Message>
      </div>

      <div
        data-testid="invoice-create-row-dates"
        class="flex flex-col gap-4 sm:flex-row sm:gap-3"
      >
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <label
            for="invoice-create-date-range"
            class="text-text-dark text-[13px] font-medium"
          >Date range</label>
          <DatePicker
            :ref="datePicker.datePickerRef"
            v-model="dateRange"
            input-id="invoice-create-date-range"
            date-format="M d, yy"
            icon-display="input"
            :invalid="dateRangeError"
            :manual-input="false"
            selection-mode="range"
            show-button-bar
            show-icon
            class="w-full"
            :pt="giTiempoDatePickerPt"
            @show="datePicker.handleShow"
          >
            <template #buttonbar>
              <DatePickerButtonBar
                @cancel="datePicker.handleCancel"
                @confirm="datePicker.handleConfirm"
              />
            </template>
          </DatePicker>
          <Message
            v-if="dateRangeError"
            severity="error"
            size="small"
            variant="simple"
          >
            Date range is required.
          </Message>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label for="invoice-services">Services / what is being billed</label>
        <InputText
          id="invoice-services"
          v-model="services"
        />
      </div>
      <div
        data-testid="invoice-create-row-pricing"
        class="flex flex-col gap-4 sm:flex-row sm:gap-3"
      >
        <div class="flex w-full flex-col gap-1 sm:w-[150px] sm:shrink-0">
          <label
            for="invoice-create-hourly-rate"
            class="text-text-dark text-[13px] font-medium"
          >Hourly rate</label>
          <InputNumber
            input-id="invoice-create-hourly-rate"
            placeholder="From settings"
            :max="99999999.99"
            :max-fraction-digits="2"
            :min="0"
            :model-value="hourlyRate"
            input-class="h-[38px] w-full"
            class="w-full"
            @update:model-value="handleRateUpdate"
          />
        </div>
        <div class="flex w-full flex-col gap-1 sm:flex-1">
          <label
            for="invoice-create-currency"
            class="text-text-dark text-[13px] font-medium"
          >Currency</label>
          <Select
            input-id="invoice-create-currency"
            :model-value="currency"
            :options="currencyOptions"
            option-label="label"
            option-value="value"
            placeholder="Auto"
            show-clear
            class="w-full"
            :pt="giTiempoFieldWidthSelectPt"
            @update:model-value="handleCurrencyUpdate"
          />
        </div>
        <div class="flex w-full flex-col gap-1 sm:flex-1">
          <label
            for="invoice-create-discount"
            class="text-text-dark text-[13px] font-medium"
          >Discount</label>
          <InputNumber
            input-id="invoice-create-discount"
            suffix="%"
            :max="100"
            :max-fraction-digits="2"
            :min="0"
            :model-value="discountPercent"
            input-class="h-[38px] w-full"
            class="w-full"
            @update:model-value="handleDiscountUpdate"
          />
        </div>
        <div class="flex w-full flex-col gap-1 sm:flex-1">
          <label
            for="invoice-create-rounding-step"
            class="text-text-dark text-[13px] font-medium"
          >Rounding step</label>
          <Select
            input-id="invoice-create-rounding-step"
            :model-value="roundingStepMinutes"
            :options="ROUNDING_STEP_OPTIONS"
            option-label="label"
            option-value="value"
            class="w-full"
            :pt="giTiempoFieldWidthSelectPt"
            @update:model-value="handleRoundingStepUpdate"
          />
        </div>
      </div>

      <Message
        v-if="saveError || revisionConflict"
        severity="error"
      >
        {{ revisionConflict ? 'This invoice changed. Refresh the latest revision, review your edits, and retry.' : saveError }}
        <Button
          v-if="revisionConflict"
          label="Refresh latest revision"
          variant="text"
          @click="reviewLatestRevision"
        />
        <Button
          v-if="calculationFailed"
          label="Refresh entries and retry"
          variant="text"
          :loading="calculating"
          @click="retryCalculation"
        />
      </Message>
      <div class="grid gap-6 sm:grid-cols-2">
        <section
          v-for="(party, label) in {From: sender, 'Bill to': recipient}"
          :key="label"
          class="flex flex-col gap-2"
        >
          <h2 class="font-semibold">
            {{ label }}
          </h2>
          <label
            v-for="(_, key) in party"
            :key="key"
            class="flex flex-col gap-1 text-sm"
          >{{ ({name:'Legal / company name',address:'Address',email:'Email',taxId:'Tax ID (optional)',method:'Payment method',terms:'Payment terms',beneficiary:'Beneficiary',provider:'Bank / payment provider',account:'Account / payment details',instructions:'Payment instructions'})[key] }}<InputText v-model="party[key]" /></label>
        </section>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <FileUpload
          mode="basic"
          name="invoice-logo"
          accept="image/png,image/svg+xml"
          choose-label="Upload logo"
          :auto="true"
          custom-upload
          @uploader="uploadLogo"
        />
        <Button
          v-if="logo"
          label="Remove logo"
          severity="secondary"
          @click="logoReadGeneration++;logo=null"
        />
      </div>
      <Button
        label="Use settings"
        severity="secondary"
        variant="text"
        @click="useSettings()"
      />
      <section class="grid gap-3 sm:grid-cols-2">
        <h2 class="font-semibold sm:col-span-2">
          How to pay
        </h2>
        <label
          v-for="(_, key) in payment"
          :key="key"
          class="flex flex-col gap-1 text-sm"
        >{{ ({name:'Legal / company name',address:'Address',email:'Email',taxId:'Tax ID (optional)',method:'Payment method',terms:'Payment terms',beneficiary:'Beneficiary',provider:'Bank / payment provider',account:'Account / payment details',instructions:'Payment instructions'})[key] }}<InputText v-model="payment[key]" /></label>
      </section>
      <Message
        v-if="selectedEntries.some(id => !preview?.entries.some(entry => entry.id===id))"
        severity="warn"
      >
        Some selected entries are outside this scope or unavailable. Review them before saving.
        <Button
          label="Keep only available entries"
          variant="text"
          @click="selectedEntries=selectedEntries.filter(id=>preview?.entries.some(entry=>entry.id===id))"
        />
      </Message>
      <p
        v-if="calculating"
        role="status"
      >
        Calculating totals…
      </p>
      <div class="flex flex-col gap-1">
        <label
          for="invoice-create-notes"
          class="text-text-dark text-[13px] font-medium"
        >Notes</label>
        <Textarea
          id="invoice-create-notes"
          v-model="notes"
          maxlength="5000"
          placeholder="Add notes..."
          class="h-20 w-full"
        />
      </div>

      <div class="flex flex-col gap-2">
        <button
          type="button"
          class="flex w-full items-center gap-1.5 rounded-sm text-left"
          data-testid="invoice-create-preview-toggle"
          :aria-controls="hasEntries ? 'invoice-create-preview-entries' : undefined"
          :aria-expanded="previewExpanded && hasEntries"
          @click="previewExpanded = !previewExpanded"
        >
          <ChevronRightIcon
            aria-hidden="true"
            class="text-text-muted size-4 shrink-0 transition-transform duration-200"
            :class="{ 'rotate-90': previewExpanded && hasEntries }"
          />
          <span class="text-text-dark text-[13px] font-medium">
            Eligible time entries
          </span>
          <span
            v-if="previewSummary"
            class="text-text-muted text-[12px]"
          >
            {{ previewSummary }}
          </span>
        </button>
        <div class="border-divider h-px w-full" />

        <Message
          v-if="previewError"
          severity="error"
          variant="simple"
          data-testid="invoice-create-preview-error"
        >
          Failed to load eligible entries. Please try again.
        </Message>
        <Message
          v-else-if="previewEmpty"
          severity="warn"
          variant="simple"
          data-testid="invoice-create-preview-empty"
        >
          No billable entries found for this project and date range
        </Message>
        <p
          v-else-if="previewLoading"
          class="text-text-muted text-xs"
          data-testid="invoice-create-preview-loading"
        >
          Loading preview…
        </p>
        <p
          v-else-if="!previewQuery"
          class="text-text-muted text-xs"
          data-testid="invoice-create-preview-hint"
        >
          Select a date range to preview eligible time entries.
        </p>

        <div
          v-if="hasEntries && previewExpanded"
          id="invoice-create-preview-entries"
        >
          <DataTable
            :value="preview?.entries ?? []"
            data-testid="invoice-create-preview-table"
            scrollable
            scroll-height="240px"
            size="small"
            class="text-left"
            :pt="{
              headerCell:
                'bg-app-bg text-text-dark px-2 py-1.5 text-[12px] font-semibold',
              bodyRow:
                'border-divider hover:bg-app-bg border-b last:border-b-0',
              bodyCell: 'text-text-dark px-2 py-1.5 text-[13px]',
            }"
          >
            <Column header="Included">
              <template #body="{data}">
                <Checkbox
                  v-model="selectedEntries"
                  :value="data.id"
                  :aria-label="'Include '+data.description"
                />
              </template>
            </Column>
            <Column
              field="startedAt"
              header="Date"
            >
              <template #body="{ data }">
                {{ formatLocalCalendarDate(data.startedAt) }}
              </template>
            </Column>
            <Column
              field="userName"
              header="User"
            >
              <template #body="{ data }">
                {{ data.userName ?? '—' }}
              </template>
            </Column>
            <Column
              header="Duration"
              header-style="text-align: right"
              body-style="text-align: right"
            >
              <template #body="{ data }">
                {{ formatDuration(data.roundedDurationSeconds) }}
              </template>
            </Column>
            <Column
              field="description"
              header="Description"
            >
              <template #body="{ data }">
                <span class="block max-w-[160px] truncate">
                  {{ data.description ?? '—' }}
                </span>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
      <dl
        v-if="calculatedPreview"
        class="border-divider ml-auto grid w-full max-w-sm grid-cols-2 gap-2 border-t pt-4"
      >
        <dt>Subtotal</dt><dd class="text-right">
          {{ formatCurrency(calculatedPreview.subtotal,calculatedPreview.currency) }}
        </dd>
        <dt>Discount</dt><dd class="text-right">
          −{{ formatCurrency(calculatedPreview.discountAmount,calculatedPreview.currency) }}
        </dd>
        <dt class="font-semibold">
          Total
        </dt><dd class="text-right font-semibold">
          {{ formatCurrency(calculatedPreview.totalAmount,calculatedPreview.currency) }}
        </dd>
      </dl>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          data-testid="invoice-create-cancel"
          severity="secondary"
          variant="outlined"
          :disabled="isCreating"
          @click="handleCancel"
        />
        <Button
          :label="editing ? 'Save changes' : 'Create invoice'"
          data-testid="invoice-create-submit"
          :loading="isCreating"
          @click="handleCreate"
        />
      </div>
    </template>
  </AppDialog>
</template>