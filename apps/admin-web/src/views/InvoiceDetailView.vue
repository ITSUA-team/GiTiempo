<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { WorkspaceRoles, type UpdateInvoiceInput } from '@gitiempo/shared';
import {
  getErrorMessage,
  SectionHeader,
  SurfaceCard,
} from '@gitiempo/web-shared';
import { ApiError } from '@gitiempo/web-shared/http';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Skeleton from 'primevue/skeleton';
import Textarea from 'primevue/textarea';

import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useConfirmation } from '@/composables/feedback/useConfirmation';
import { useToasts } from '@/composables/feedback/useToasts';
import { useInvoiceDelete } from '@/composables/invoices/useInvoiceDelete';
import { useInvoiceDetail } from '@/composables/invoices/useInvoiceDetail';
import { useInvoiceUpdate } from '@/composables/invoices/useInvoiceUpdate';
import { formatCurrency } from '@/lib/format-currency';
import { formatDuration } from '@/lib/format-duration';
import { getAdminServerStateScope } from '@/lib/server-state-scope';
import { routeNames } from '@/constants/routes';
import { useAuthStore } from '@/stores/auth';

const DELETE_CONFIRMATION_MESSAGE =
  'Delete this invoice? Linked time entries will be unlinked and become available for future invoices.';

const CONFLICT_TOAST_BY_CODE = {
  invoice_invalid_status_transition: 'This status change is not allowed',
  invoice_not_deletable:
    'This invoice can no longer be deleted because its status changed',
  invoice_update_conflict:
    'This invoice was modified by another user. Please review and try again',
} as const satisfies Record<string, string>;

type InvoiceConflictCode = keyof typeof CONFLICT_TOAST_BY_CODE;

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { errorToast, successToast } = useToasts();
const { requireConfirmation } = useConfirmation();

const accessToken = computed(() => authStore.accessToken);
const scope = computed(() => getAdminServerStateScope(accessToken.value));
const isAdmin = computed(
  () => authStore.profile?.role === WorkspaceRoles.Admin,
);

const invoiceId = computed(() => {
  const id = route.params.id;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
});

const {
  error,
  invoice,
  loading,
  notFound,
  refetch,
} = useInvoiceDetail({
  enabled: computed(() => Boolean(accessToken.value)),
  invoiceId,
  onError: notifyInvoiceActionError,
  scope,
});

const updateMutation = useInvoiceUpdate({
  onError: notifyInvoiceActionError,
  onSuccess: () => successToast('Invoice updated'),
  scope,
});

const deleteMutation = useInvoiceDelete({
  onError: notifyInvoiceActionError,
  onSuccess: () => {
    successToast('Invoice deleted');
    router.push({ name: routeNames.invoices });
  },
  scope,
});

const editNotes = ref('');
const editTitle = ref('');

watch(
  invoice,
  (currentInvoice) => {
    if (currentInvoice) {
      editNotes.value = currentInvoice.notes ?? '';
      editTitle.value = currentInvoice.title;
    }
  },
  { immediate: true },
);

function isInvoiceConflictCode(code: string): code is InvoiceConflictCode {
  return code in CONFLICT_TOAST_BY_CODE;
}

function getInvoiceConflictCode(error: unknown): InvoiceConflictCode | null {
  if (error instanceof ApiError && typeof error.code === 'string') {
    return isInvoiceConflictCode(error.code) ? error.code : null;
  }

  return null;
}

function notifyInvoiceActionError(
  message: string,
  actionError: unknown,
  action: string,
): void {
  // A 404 already renders the not-found view; a toast would duplicate the feedback.
  if (actionError instanceof ApiError && actionError.status === 404) {
    return;
  }

  const code = getInvoiceConflictCode(actionError);

  if (code) {
    errorToast(CONFLICT_TOAST_BY_CODE[code], {
      error: actionError,
      logContext: { action, feature: 'invoices' },
    });
    void refetch();
    return;
  }

  errorToast(message, {
    error: actionError,
    logContext: { action, feature: 'invoices' },
  });
}

function swallowReportedError(): void {
  // Mutation errors are already toasted (and reloaded on conflicts) inside
  // notifyInvoiceActionError; the rethrown promise only needs to be silenced.
}

function markAsSent(): void {
  runUpdate({ status: 'sent' });
}

function markAsPaid(): void {
  runUpdate({ status: 'paid' });
}

function saveEdits(): void {
  runUpdate({
    notes: editNotes.value || null,
    title: editTitle.value,
  });
}

function runUpdate(data: UpdateInvoiceInput): void {
  updateMutation
    .updateInvoice({ data, invoiceId: invoiceId.value })
    .catch(swallowReportedError);
}

function confirmDelete(): void {
  requireConfirmation(
    DELETE_CONFIRMATION_MESSAGE,
    'Delete invoice?',
    'Delete',
    () => {
      deleteInvoice();
    },
  );
}

function deleteInvoice(): void {
  deleteMutation
    .deleteInvoice(invoiceId.value)
    .catch(swallowReportedError);
}

function goBack(): void {
  router.push({ name: routeNames.invoices });
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

const instantFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatDate(dateKey: string): string {
  return dateFormatter.format(new Date(`${dateKey}T00:00:00Z`));
}

function formatInstant(dateInput: string): string {
  return instantFormatter.format(new Date(dateInput));
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="loading && !invoice">
      <div class="flex flex-col gap-4">
        <Skeleton
          height="2rem"
          width="12rem"
        />
        <SurfaceCard padding-class="p-6">
          <Skeleton height="8rem" />
        </SurfaceCard>
        <SurfaceCard padding-class="p-6">
          <Skeleton height="6rem" />
        </SurfaceCard>
      </div>
    </template>

    <template v-else-if="notFound">
      <div
        class="flex flex-col items-center gap-4 py-12"
        data-testid="invoice-not-found"
      >
        <span class="text-text-dark text-lg font-semibold">
          Invoice not found
        </span>
        <Button
          label="Back to invoices"
          variant="outlined"
          @click="goBack"
        />
      </div>
    </template>

    <template v-else-if="error && !invoice">
      <RequestErrorCard
        title="Failed to load invoice"
        :message="getErrorMessage(error)"
        data-testid="invoice-load-error"
        @retry="refetch"
      />
    </template>

    <template v-else-if="invoice">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        data-testid="invoice-detail-header"
      >
        <div class="flex items-center gap-3">
          <Button
            icon="pi pi-arrow-left"
            variant="text"
            severity="secondary"
            aria-label="Back to invoices"
            data-testid="invoice-back-button"
            @click="goBack"
          />
          <h1 class="text-text-dark text-lg font-semibold">
            {{ invoice.title }}
          </h1>
          <InvoiceStatusBadge :status="invoice.status" />
        </div>
        <div class="flex gap-2">
          <Button
            v-if="invoice.status === 'draft'"
            label="Mark as sent"
            severity="secondary"
            variant="outlined"
            :loading="updateMutation.isUpdating.value"
            data-testid="invoice-mark-as-sent"
            @click="markAsSent"
          />
          <Button
            v-if="invoice.status === 'draft' && isAdmin"
            label="Delete"
            severity="danger"
            variant="outlined"
            :loading="deleteMutation.isDeleting.value"
            data-testid="invoice-delete"
            @click="confirmDelete"
          />
          <Button
            v-if="invoice.status === 'sent'"
            label="Mark as paid"
            severity="secondary"
            variant="outlined"
            :loading="updateMutation.isUpdating.value"
            data-testid="invoice-mark-as-paid"
            @click="markAsPaid"
          />
        </div>
      </div>

      <SurfaceCard
        padding-class="p-6"
        data-testid="invoice-summary"
      >
        <SectionHeader title="Summary" />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-sm">Project</span>
            <p class="font-medium">
              {{ invoice.project?.name ?? 'Workspace-wide' }}
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-sm">Date range</span>
            <p class="font-medium">
              {{ formatDate(invoice.dateFrom) }} –
              {{ formatDate(invoice.dateTo) }}
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-sm">Hourly rate</span>
            <p class="font-medium">
              {{ formatCurrency(invoice.hourlyRate, invoice.currency) }}
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-sm">Currency</span>
            <p class="font-medium">
              {{ invoice.currency }}
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-sm">Discount</span>
            <p class="font-medium">
              {{ invoice.discountPercent }}%
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-sm">Total hours</span>
            <p class="font-medium">
              {{ invoice.totalHours }}h
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-sm">Total amount</span>
            <p class="font-medium">
              {{ formatCurrency(invoice.totalAmount, invoice.currency) }}
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-sm">Created</span>
            <p class="font-medium">
              {{ formatInstant(invoice.createdAt) }}
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-sm">Created by</span>
            <p class="font-medium">
              {{ invoice.createdByName ?? 'Unknown' }}
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-sm">Last updated</span>
            <p class="font-medium">
              {{ formatInstant(invoice.updatedAt) }}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        padding-class="p-6"
        data-testid="invoice-edit-details"
      >
        <SectionHeader title="Edit details" />
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <label
              class="text-text-dark text-[13px] font-medium"
              for="invoice-title"
            >
              Title
            </label>
            <InputText
              id="invoice-title"
              v-model="editTitle"
              class="h-[38px]"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label
              class="text-text-dark text-[13px] font-medium"
              for="invoice-notes"
            >
              Notes
            </label>
            <Textarea
              id="invoice-notes"
              v-model="editNotes"
              rows="4"
            />
          </div>
          <div class="flex justify-end">
            <Button
              label="Save changes"
              :loading="updateMutation.isUpdating.value"
              data-testid="invoice-save"
              @click="saveEdits"
            />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        padding-class="p-6"
        data-testid="invoice-time-entries"
      >
        <SectionHeader
          :description="`${invoice.totalHours}h total`"
          :title="`Time entries (${invoice.timeEntryCount})`"
        />
        <div
          v-if="invoice.timeEntries.length === 0"
          class="text-text-muted py-4 text-center text-sm"
          data-testid="invoice-time-entries-empty"
        >
          No time entries linked to this invoice.
        </div>
        <div
          v-else
          class="overflow-x-auto"
          data-testid="invoice-time-entries-table"
        >
          <table class="w-full text-sm">
            <thead>
              <tr class="border-divider text-text-muted border-b">
                <th class="px-3 py-2 text-left font-medium">
                  Date
                </th>
                <th class="px-3 py-2 text-left font-medium">
                  User
                </th>
                <th class="px-3 py-2 text-left font-medium">
                  Task
                </th>
                <th class="px-3 py-2 text-right font-medium">
                  Duration
                </th>
                <th class="px-3 py-2 text-left font-medium">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in invoice.timeEntries"
                :key="entry.id"
                class="border-divider border-b last:border-b-0"
              >
                <td class="px-3 py-2">
                  {{ formatInstant(entry.startedAt) }}
                </td>
                <td class="px-3 py-2">
                  {{ entry.userName ?? 'Unknown' }}
                </td>
                <td class="px-3 py-2">
                  {{ entry.taskName ?? '—' }}
                </td>
                <td class="px-3 py-2 text-right">
                  {{ formatDuration(entry.durationSeconds) }}
                </td>
                <td class="text-text-muted px-3 py-2">
                  {{ entry.description ?? '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </template>
  </div>
</template>