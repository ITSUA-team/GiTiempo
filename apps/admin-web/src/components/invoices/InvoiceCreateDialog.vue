<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue';
import type {
  CreateInvoiceInput,
  EligibleEntriesQuery,
  InvoiceResponse,
} from '@gitiempo/shared';
import { AppDialog } from '@gitiempo/web-shared';
import {
  formatLocalCalendarDate,
  getLocalDateKey,
} from '@gitiempo/web-shared/time';
import {
  giTiempoDatePickerPt,
  giTiempoSelectPt,
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
import { formatCurrency } from '@/lib/format-currency';
import { formatDuration } from '@/lib/format-duration';
import type { AdminServerStateScope } from '@/lib/query-keys';

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
  projects: Array<{ id: string; name: string }>;
  scope: AdminServerStateScope;
  createMutation: InvoiceCreateMutation;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  created: [invoice: InvoiceResponse];
}>();

const WORKSPACE_WIDE_PROJECT_VALUE = '';

const title = ref('');
const selectedProjectId = ref<string | null>(null);
const dateRange = ref<Date[] | null>(null);
const hourlyRate = ref<number | null>(null);
const currency = ref('');
const discountPercent = ref<number | null>(0);
const notes = ref('');

const rateTouched = ref(false);
const currencyTouched = ref(false);
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
    notes.value = '';
    rateTouched.value = false;
    currencyTouched.value = false;
    validationTriggered.value = false;
    previewExpanded.value = false;
  },
);

// Pre-fill rate/currency from the workspace defaults until the user edits
// those fields; after a manual change the entered values win.
watch(
  [preview, () => props.visible],
  ([data, visible]) => {
    if (!visible || !data) return;
    if (
      !rateTouched.value &&
      hourlyRate.value === null &&
      data.defaultHourlyRate !== null
    ) {
      hourlyRate.value = data.defaultHourlyRate;
    }
    if (
      !currencyTouched.value &&
      currency.value === '' &&
      data.defaultCurrency !== null
    ) {
      currency.value = data.defaultCurrency;
    }
  },
  { immediate: true },
);

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

const hasValidCurrency = computed(() => {
  const entered = currency.value.trim();
  if (!entered) return true; // empty is valid — uses workspace default
  return /^[A-Za-z]{3}$/.test(entered);
});

const currencyError = computed(
  () => validationTriggered.value && !hasValidCurrency.value,
);

const canSubmit = computed(
  () =>
    hasTitle.value &&
    hasDateRange.value &&
    hasValidCurrency.value &&
    (props.isAdmin || Boolean(selectedProjectId.value)),
);

// Intl.NumberFormat throws RangeError on codes shorter than 3 letters, so
// partial input falls back to the workspace default until the code completes.
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
  return data.totalHours * rate * (1 - (discountPercent.value ?? 0) / 100);
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
  currency.value = value?.toUpperCase() ?? '';
  currencyTouched.value = true;
}

function handleDiscountUpdate(value: number | null): void {
  discountPercent.value = value ?? 0;
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
    :style="{ width: '480px' }"
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
          :pt="giTiempoSelectPt"
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

      <div class="flex gap-3">
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <label
            for="invoice-create-date-range"
            class="text-text-dark text-[13px] font-medium"
          >Date range</label>
          <DatePicker
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
          />
          <Message
            v-if="dateRangeError"
            severity="error"
            size="small"
            variant="simple"
          >
            Date range is required.
          </Message>
        </div>
        <div class="flex w-[150px] shrink-0 flex-col gap-1">
          <label
            for="invoice-create-hourly-rate"
            class="text-text-dark text-[13px] font-medium"
          >Hourly rate</label>
          <InputNumber
            input-id="invoice-create-hourly-rate"
            placeholder="From workspace settings"
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

      <div class="flex gap-3">
        <div class="flex w-[150px] shrink-0 flex-col gap-1">
          <label
            for="invoice-create-currency"
            class="text-text-dark text-[13px] font-medium"
          >Currency</label>
          <InputText
            id="invoice-create-currency"
            :model-value="currency"
            maxlength="3"
            placeholder="Auto"
            :invalid="currencyError"
            class="h-[38px] w-full"
            @update:model-value="handleCurrencyUpdate"
          />
          <Message
            v-if="currencyError"
            severity="error"
            size="small"
            variant="simple"
          >
            Currency must be a 3-letter code (e.g., USD).
          </Message>
        </div>
        <div class="flex w-[150px] shrink-0 flex-col gap-1">
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
                {{ formatDuration(data.durationSeconds) }}
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