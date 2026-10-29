<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue';
import type {
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

import { useEligibleEntriesPreview } from '@/composables/invoices/useEligibleEntriesPreview';
import { getSettingsCurrencyOptions } from '@/lib/currencies';
import { formatCurrency } from '@/lib/format-currency';
import { computeInvoiceAmount } from '@/lib/invoice-amount';
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
  scope: AdminServerStateScope;
  createMutation: InvoiceCreateMutation;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  created: [invoice: InvoiceResponse];
}>();

const WORKSPACE_WIDE_PROJECT_VALUE = '';

const ROUNDING_STEP_OPTIONS = getRoundingStepOptions();

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

const previewQuery = computed<EligibleEntriesQuery | null>(() => {
  const dates = dateRange.value;
  if (!dates?.[0] || !dates[1]) return null;
  if (!props.isAdmin && !selectedProjectId.value) return null;
  return {
    dateFrom: getLocalDateKey(dates[0]),
    dateTo: getLocalDateKey(dates[1]),
    projectId: selectedProjectId.value || undefined,
    ...(roundingStepTouched.value
      ? { roundingStepMinutes: roundingStepMinutes.value }
      : {}),
  };
});

const {
  preview,
  isLoading: previewLoading,
  isEmpty: previewEmpty,
  isError: previewError,
  hasEntries,
} = useEligibleEntriesPreview({
  enabled: computed(() => props.visible),
  scope: computed(() => props.scope),
  query: previewQuery,
});

// Reset on any visibility change, before the pre-fill watcher below so a
// reopened dialog starts blank and then receives the preview defaults again.
watch(
  () => props.visible,
  () => {
    title.value = '';
    selectedProjectId.value = null;
    dateRange.value = null;
    hourlyRate.value = null;
    currency.value = '';
    discountPercent.value = 0;
    roundingStepMinutes.value = 1;
    notes.value = '';
    rateTouched.value = false;
    currencyTouched.value = false;
    roundingStepTouched.value = false;
    validationTriggered.value = false;
    previewExpanded.value = false;
  },
);

// Pre-fill the workspace Settings hourly rate as soon as the dialog opens, and
// keep following it while the settings load late or change while open — until
// the user edits the field. It stays authoritative: the preview sync below
// fills the rate only while no workspace rate is known yet.
watch(
  [() => props.workspaceHourlyRate, () => props.visible],
  ([workspaceHourlyRate, visible]) => {
    if (!visible || rateTouched.value || workspaceHourlyRate === null) return;
    hourlyRate.value = workspaceHourlyRate;
  },
  { immediate: true },
);

// Pre-select the workspace Settings currency as soon as the dialog opens, and
// keep following it while the settings load late or change while open — until
// the user edits the field. It stays authoritative: the preview sync below
// fills the currency only while no workspace currency is known yet.
watch(
  [() => props.workspaceCurrency, () => props.visible],
  ([workspaceCurrency, visible]) => {
    if (!visible || currencyTouched.value || !workspaceCurrency) return;
    currency.value = workspaceCurrency;
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
    // preview default is only the fallback for when the settings query failed
    // and the workspace rate is unknown.
    if (
      !rateTouched.value &&
      !props.workspaceHourlyRate &&
      data.defaultHourlyRate !== null
    ) {
      hourlyRate.value = data.defaultHourlyRate;
    }
    // The workspace settings currency always wins over the preview value; the
    // preview default is only the fallback for when the settings query failed
    // and the workspace currency is unknown.
    if (
      !currencyTouched.value &&
      !props.workspaceCurrency &&
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
const computedTotalAmount = computed<number | null>(() => {
  const data = preview.value;
  if (!data) return null;
  const rate = hourlyRate.value ?? data.defaultHourlyRate ?? 0;
  return computeInvoiceAmount(data.totalHours, rate, discountPercent.value ?? 0);
});

const previewSummary = computed<string | null>(() => {
  const data = preview.value;
  if (!data || !hasEntries.value) return null;

  const currencyCode = previewCurrencyCode.value;
  const amount = computedTotalAmount.value;
  const parts = [
    data.count === 1 ? '1 entry' : `${data.count} entries`,
    `${data.totalHours}h`,
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

async function handleCreate(): Promise<void> {
  validationTriggered.value = true;
  if (!canSubmit.value) return;

  const startDate = dateRange.value?.[0];
  const endDate = dateRange.value?.[1];
  if (!startDate || !endDate) return;

  try {
    const invoice = await props.createMutation.createInvoice({
      title: title.value.trim(),
      dateFrom: getLocalDateKey(startDate),
      dateTo: getLocalDateKey(endDate),
      projectId: selectedProjectId.value || undefined,
      hourlyRate: hourlyRate.value ?? undefined,
      currency: currency.value.trim().toUpperCase() || undefined,
      discountPercent: discountPercent.value ?? 0,
      notes: notes.value.trim() || undefined,
      ...(roundingStepTouched.value
        ? { roundingStepMinutes: roundingStepMinutes.value }
        : {}),
    });
    emit('created', invoice);
    emit('update:visible', false);
  } catch {
    // The parent view owns error toasts for create failures; the dialog
    // stays open with the entered values preserved.
  }
}
</script>

<template>
  <AppDialog
    header="Create Invoice"
    modal
    :closable="!isCreating"
    :dismissable-mask="!isCreating"
    :pt="{ root: 'w-[min(480px,calc(100vw-2rem))]' }"
    :visible="visible"
    @update:visible="handleVisibleChange"
  >
    <div class="flex flex-col gap-4">
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
      </div>

      <div
        data-testid="invoice-create-row-pricing"
        class="flex flex-col gap-4 sm:flex-row sm:gap-3"
      >
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
          label="Create invoice"
          data-testid="invoice-create-submit"
          :loading="isCreating"
          @click="handleCreate"
        />
      </div>
    </template>
  </AppDialog>
</template>