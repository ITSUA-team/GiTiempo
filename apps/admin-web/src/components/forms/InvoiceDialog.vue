<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type {
  InvoiceResponse,
  InvoiceStatus,
  ProjectResponse,
} from '@gitiempo/shared';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import AutoComplete from 'primevue/autocomplete';
import Tag from 'primevue/tag';

import {
  formatInvoiceAmount,
  getInvoiceStatusLabel,
  getInvoiceStatusSeverity,
  formatDateRange,
} from '@/lib/invoice-display';

export type DialogMode = 'create' | 'edit';

interface CreateFormState {
  title: string;
  projectId: string | null;
  dateRange: [Date, Date] | null;
  hourlyRate: number | null;
  discountPercent: number | null;
  notes: string;
}

interface EditFormState {
  title: string;
  hourlyRate: number;
  discountPercent: number;
  notes: string;
}

const props = defineProps<{
  visible: boolean;
  mode: DialogMode;
  invoice: InvoiceResponse | null;
  projects: ProjectResponse[];
  saving: boolean;
  isAdmin: boolean;
  deleting: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'create': [payload: {
    title: string;
    projectId?: string;
    dateFrom: string;
    dateTo: string;
    hourlyRate?: number;
    discountPercent?: number;
    notes?: string | null;
  }];
  'update-invoice': [invoice: InvoiceResponse, payload: {
    title?: string;
    status?: InvoiceStatus;
    hourlyRate?: number;
    discountPercent?: number;
    notes?: string | null;
  }];
  'send-invoice': [invoice: InvoiceResponse];
  'mark-paid': [invoice: InvoiceResponse];
  'delete-invoice': [invoice: InvoiceResponse];
}>();

const createForm = ref<CreateFormState>({
  title: '',
  projectId: null,
  dateRange: null,
  hourlyRate: null,
  discountPercent: null,
  notes: '',
});

const editForm = ref<EditFormState>({
  title: '',
  hourlyRate: 0,
  discountPercent: 0,
  notes: '',
});

const titleError = ref<string | null>(null);
const dateRangeError = ref<string | null>(null);

const isDraft = computed(() => props.invoice?.status === 'draft');
const isSent = computed(() => props.invoice?.status === 'sent');

const canEditDetails = computed(() => isDraft.value);
const canSend = computed(() => isDraft.value && props.mode === 'edit');
const canMarkPaid = computed(() => isSent.value && props.mode === 'edit');
const canDelete = computed(() => props.mode === 'edit' && props.isAdmin);

const dialogHeader = computed(() => {
  if (props.mode === 'create') {
    return 'Create invoice';
  }
  return props.invoice?.title ?? 'Invoice';
});

const dialogStyle = computed(() => ({
  width: '560px',
}));

const projectSuggestions = ref<ProjectResponse[]>([]);

function filterProjects(event: { query: string }): void {
  const query = event.query.toLowerCase();
  projectSuggestions.value = props.projects.filter((p) =>
    p.name.toLowerCase().includes(query),
  );
}

function toDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resetCreateForm(): void {
  createForm.value = {
    title: '',
    projectId: null,
    dateRange: null,
    hourlyRate: null,
    discountPercent: null,
    notes: '',
  };
  titleError.value = null;
  dateRangeError.value = null;
}

function populateEditForm(invoice: InvoiceResponse): void {
  editForm.value = {
    title: invoice.title,
    hourlyRate: invoice.hourlyRate,
    discountPercent: invoice.discountPercent,
    notes: invoice.notes ?? '',
  };
  titleError.value = null;
  dateRangeError.value = null;
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      if (props.mode === 'create') {
        resetCreateForm();
      } else if (props.invoice) {
        populateEditForm(props.invoice);
      }
    }
  },
);

watch(
  () => props.invoice,
  (invoice) => {
    if (invoice && props.mode === 'edit' && props.visible) {
      populateEditForm(invoice);
    }
  },
);

function closeDialog(): void {
  emit('update:visible', false);
}

function validateCreate(): boolean {
  let valid = true;
  titleError.value = null;
  dateRangeError.value = null;

  if (!createForm.value.title.trim()) {
    titleError.value = 'Title is required.';
    valid = false;
  }

  if (
    !createForm.value.dateRange ||
    !createForm.value.dateRange[0] ||
    !createForm.value.dateRange[1]
  ) {
    dateRangeError.value = 'Date range is required.';
    valid = false;
  } else if (
    createForm.value.dateRange[1].getTime() <
    createForm.value.dateRange[0].getTime()
  ) {
    dateRangeError.value = 'End date must be on or after start date.';
    valid = false;
  }

  return valid;
}

function handleCreateSubmit(): void {
  if (!validateCreate()) return;

  const [from, to] = createForm.value.dateRange!;
  const payload: {
    title: string;
    projectId?: string;
    dateFrom: string;
    dateTo: string;
    hourlyRate?: number;
    discountPercent?: number;
    notes?: string | null;
  } = {
    title: createForm.value.title.trim(),
    dateFrom: toDateString(from),
    dateTo: toDateString(to),
  };

  if (createForm.value.projectId) {
    payload.projectId = createForm.value.projectId;
  }
  if (createForm.value.hourlyRate !== null && createForm.value.hourlyRate > 0) {
    payload.hourlyRate = createForm.value.hourlyRate;
  }
  if (
    createForm.value.discountPercent !== null &&
    createForm.value.discountPercent > 0
  ) {
    payload.discountPercent = createForm.value.discountPercent;
  }
  if (createForm.value.notes.trim()) {
    payload.notes = createForm.value.notes.trim();
  }

  emit('create', payload);
}

function handleEditSave(): void {
  if (!props.invoice) return;

  if (canEditDetails.value && !editForm.value.title.trim()) {
    titleError.value = 'Title is required.';
    return;
  }

  const payload: {
    title?: string;
    hourlyRate?: number;
    discountPercent?: number;
    notes?: string | null;
  } = {};

  if (canEditDetails.value) {
    if (editForm.value.title !== props.invoice.title) {
      payload.title = editForm.value.title.trim();
    }
    if (editForm.value.hourlyRate !== props.invoice.hourlyRate) {
      payload.hourlyRate = editForm.value.hourlyRate;
    }
    if (editForm.value.discountPercent !== props.invoice.discountPercent) {
      payload.discountPercent = editForm.value.discountPercent;
    }
  }

  const currentNotes = props.invoice.notes ?? '';
  if (editForm.value.notes !== currentNotes) {
    payload.notes = editForm.value.notes.trim() || null;
  }

  if (
    payload.title === undefined &&
    payload.hourlyRate === undefined &&
    payload.discountPercent === undefined &&
    payload.notes === undefined
  ) {
    closeDialog();
    return;
  }

  emit('update-invoice', props.invoice, payload);
}

function handleSend(): void {
  if (props.invoice) {
    emit('send-invoice', props.invoice);
  }
}

function handleMarkPaid(): void {
  if (props.invoice) {
    emit('mark-paid', props.invoice);
  }
}

function handleDelete(): void {
  if (props.invoice) {
    emit('delete-invoice', props.invoice);
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="dialogHeader"
    :style="dialogStyle"
    :dismissable-mask="mode === 'create'"
    data-testid="invoice-dialog"
    @update:visible="emit('update:visible', $event)"
  >
    <template #default>
      <!-- Create mode -->
      <div
        v-if="mode === 'create'"
        class="flex flex-col gap-4"
      >
        <div class="flex flex-col gap-1">
          <label
            for="invoice-title"
            class="text-text-dark text-[13px] font-medium"
          >Title</label>
          <InputText
            id="invoice-title"
            v-model="createForm.title"
            :invalid="!!titleError"
            class="w-full"
            placeholder="e.g. March 2026 Invoice"
            maxlength="255"
          />
          <small
            v-if="titleError"
            class="text-destructive text-xs"
          >{{ titleError }}</small>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="invoice-project"
            class="text-text-dark text-[13px] font-medium"
          >Project <span class="text-text-muted">(optional)</span></label>
          <AutoComplete
            id="invoice-project"
            v-model="createForm.projectId"
            :suggestions="projectSuggestions"
            :dropdown="true"
            option-label="name"
            option-value="id"
            placeholder="All eligible projects"
            class="w-full"
            force-selection
            @complete="filterProjects"
          />
          <small class="text-text-muted text-xs">Leave empty to invoice all eligible time entries across your accessible projects.</small>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="invoice-date-range"
            class="text-text-dark text-[13px] font-medium"
          >Date range</label>
          <DatePicker
            id="invoice-date-range"
            v-model="createForm.dateRange"
            selection-mode="range"
            :manual-input="false"
            show-icon
            show-clear
            class="w-full"
            :invalid="!!dateRangeError"
          />
          <small
            v-if="dateRangeError"
            class="text-destructive text-xs"
          >{{ dateRangeError }}</small>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label
              for="invoice-hourly-rate"
              class="text-text-dark text-[13px] font-medium"
            >Hourly rate <span class="text-text-muted">(optional)</span></label>
            <InputNumber
              id="invoice-hourly-rate"
              v-model="createForm.hourlyRate"
              mode="currency"
              currency="USD"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              :min="0.01"
              class="w-full"
              placeholder="Workspace default"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="invoice-discount"
              class="text-text-dark text-[13px] font-medium"
            >Discount % <span class="text-text-muted">(optional)</span></label>
            <InputNumber
              id="invoice-discount"
              v-model="createForm.discountPercent"
              suffix="%"
              :min="0"
              :max="100"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              class="w-full"
              placeholder="0"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="invoice-notes"
            class="text-text-dark text-[13px] font-medium"
          >Notes <span class="text-text-muted">(optional)</span></label>
          <Textarea
            id="invoice-notes"
            v-model="createForm.notes"
            rows="3"
            class="w-full"
            maxlength="5000"
          />
        </div>

        <div class="bg-app-bg text-text-muted rounded-sm p-3 text-xs">
          The backend automatically selects eligible billable time entries in the selected date range and project scope, calculates totals, and links them to the new invoice atomically. You cannot invoice the same time entry twice.
        </div>
      </div>

      <!-- Edit mode -->
      <div
        v-else-if="invoice"
        class="flex flex-col gap-4"
      >
        <div class="flex items-center gap-3">
          <Tag
            :severity="getInvoiceStatusSeverity(invoice.status)"
            :value="getInvoiceStatusLabel(invoice.status)"
            :pt="{ root: 'rounded-sm px-2 py-0.5 text-xs font-medium' }"
          />
          <span class="text-text-muted text-[13px]">
            {{ formatDateRange(invoice.dateFrom, invoice.dateTo) }}
          </span>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="invoice-edit-title"
            class="text-text-dark text-[13px] font-medium"
          >Title</label>
          <InputText
            id="invoice-edit-title"
            v-model="editForm.title"
            :invalid="!!titleError"
            :disabled="!canEditDetails"
            class="w-full"
            maxlength="255"
          />
          <small
            v-if="titleError"
            class="text-destructive text-xs"
          >{{ titleError }}</small>
          <small
            v-else-if="!canEditDetails"
            class="text-text-muted text-xs"
          >Title can only be changed on draft invoices.</small>
        </div>

        <div
          v-if="invoice.project"
          class="flex flex-col gap-1"
        >
          <span class="text-text-dark text-[13px] font-medium">Project</span>
          <span class="text-text-muted text-[13px]">{{ invoice.project.name }}</span>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label
              for="invoice-edit-rate"
              class="text-text-dark text-[13px] font-medium"
            >Hourly rate</label>
            <InputNumber
              id="invoice-edit-rate"
              v-model="editForm.hourlyRate"
              mode="currency"
              :currency="invoice.currency"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              :min="0.01"
              :disabled="!canEditDetails"
              class="w-full"
            />
            <small
              v-if="!canEditDetails"
              class="text-text-muted text-xs"
            >Rate can only be changed on draft invoices.</small>
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="invoice-edit-discount"
              class="text-text-dark text-[13px] font-medium"
            >Discount %</label>
            <InputNumber
              id="invoice-edit-discount"
              v-model="editForm.discountPercent"
              suffix="%"
              :min="0"
              :max="100"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              :disabled="!canEditDetails"
              class="w-full"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-text-dark text-[13px] font-medium">Total hours</span>
            <span class="text-text-dark text-sm font-semibold">{{ invoice.totalHours }}h</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-dark text-[13px] font-medium">Total amount</span>
            <span class="text-text-dark text-sm font-semibold">{{ formatInvoiceAmount(invoice.totalAmount, invoice.currency) }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-text-dark text-[13px] font-medium">Time entries</span>
          <span class="text-text-muted text-[13px]">{{ invoice.timeEntryCount }} linked</span>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="invoice-edit-notes"
            class="text-text-dark text-[13px] font-medium"
          >Notes</label>
          <Textarea
            id="invoice-edit-notes"
            v-model="editForm.notes"
            rows="3"
            class="w-full"
            maxlength="5000"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <!-- Left side: delete (admin only, edit mode) -->
        <div>
          <Button
            v-if="canDelete"
            severity="danger"
            variant="outlined"
            size="small"
            :loading="deleting"
            label="Delete invoice"
            data-testid="invoice-dialog-delete"
            @click="handleDelete"
          />
        </div>

        <!-- Right side: status actions + save/close -->
        <div class="flex items-center gap-2">
          <Button
            v-if="canSend"
            severity="secondary"
            variant="outlined"
            size="small"
            :loading="saving"
            label="Send invoice"
            data-testid="invoice-dialog-send"
            @click="handleSend"
          />
          <Button
            v-if="canMarkPaid"
            severity="secondary"
            variant="outlined"
            size="small"
            :loading="saving"
            label="Mark as paid"
            data-testid="invoice-dialog-mark-paid"
            @click="handleMarkPaid"
          />
          <Button
            v-if="mode === 'create'"
            size="small"
            :loading="saving"
            label="Create invoice"
            data-testid="invoice-dialog-create"
            @click="handleCreateSubmit"
          />
          <Button
            v-else
            size="small"
            :loading="saving"
            label="Save changes"
            data-testid="invoice-dialog-save"
            @click="handleEditSave"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>