<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  StatCard,
  SurfaceCard,
  useIsMobileViewport,
} from '@gitiempo/web-shared';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import InvoiceDialog, {
  type DialogMode,
} from '@/components/forms/InvoiceDialog.vue';
import InvoicesTable from '@/components/InvoicesTable.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useConfirmation } from '@/composables/feedback/useConfirmation';
import { useToasts } from '@/composables/feedback/useToasts';
import { useInvoicesData } from '@/composables/invoices/useInvoicesData';
import { useInvoiceActions } from '@/composables/invoices/useInvoiceActions';
import { useInvoicesTableState } from '@/composables/useInvoicesTableState';
import { useInvoiceStats } from '@/lib/invoice-stats';
import type { InvoiceResponse } from '@gitiempo/shared';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { requireConfirmation } = useConfirmation();
const { errorToast, successToast } = useToasts();
const isMobileViewport = useIsMobileViewport();

const accessToken = computed(() => authStore.accessToken);
const profile = computed(() => authStore.profile);

const dialogVisible = ref(false);
const dialogMode = ref<DialogMode>('create');
const dialogInvoice = ref<InvoiceResponse | null>(null);

function notifyInvoicesError(
  message: string,
  error: unknown,
  action: string,
): void {
  errorToast(message, {
    error,
    logContext: { action, feature: 'invoices' },
  });
}

const {
  initialLoaded,
  invoices,
  loadError,
  loading,
  loadInvoicesData,
  projects,
  refreshInvoices,
} = useInvoicesData({
  accessToken,
  onError: notifyInvoicesError,
});

const {
  emptyDescription,
  filters,
  projectFilterOptions,
  rows,
  statusFilterOptions,
  updateFilters,
} = useInvoicesTableState({
  invoices,
  projects,
});

const stats = useInvoiceStats(invoices);

const {
  creating,
  deletingInvoiceId,
  handleCreateInvoice,
  handleDeleteInvoice,
  handleMarkPaid,
  handleSendInvoice,
  handleUpdateInvoice,
  isAdmin,
  savingInvoiceId,
} = useInvoiceActions({
  accessToken,
  onError: notifyInvoicesError,
  onSuccess: successToast,
  profile,
  refreshInvoices,
  requireConfirmation,
});

const isDialogSaving = computed(() => {
  if (dialogMode.value === 'create') {
    return creating.value;
  }
  if (dialogInvoice.value) {
    return savingInvoiceId.value === dialogInvoice.value.id;
  }
  return false;
});

const isDialogDeleting = computed(() => {
  if (dialogInvoice.value) {
    return deletingInvoiceId.value === dialogInvoice.value.id;
  }
  return false;
});

async function fetchAll(): Promise<void> {
  await loadInvoicesData({
    errorAction: 'load-invoices',
    setError: true,
    setInitialLoaded: true,
  });
}

function handleCreateClick(): void {
  dialogMode.value = 'create';
  dialogInvoice.value = null;
  dialogVisible.value = true;
}

function handleOpenInvoice(row: typeof rows.value[number]): void {
  dialogMode.value = 'edit';
  dialogInvoice.value = row.invoice;
  dialogVisible.value = true;
}

async function handleCreate(payload: {
  title: string;
  projectId?: string;
  dateFrom: string;
  dateTo: string;
  hourlyRate?: number;
  discountPercent?: number;
  notes?: string | null;
}): Promise<void> {
  const created = await handleCreateInvoice(payload);
  if (created) {
    dialogVisible.value = false;
  }
}

async function handleUpdateInvoice_(
  invoice: InvoiceResponse,
  payload: {
    title?: string;
    hourlyRate?: number;
    discountPercent?: number;
    notes?: string | null;
  },
): Promise<void> {
  const updated = await handleUpdateInvoice(invoice, payload);
  if (updated) {
    dialogVisible.value = false;
  }
}

async function handleSend(invoice: InvoiceResponse): Promise<void> {
  const updated = await handleSendInvoice(invoice);
  if (updated) {
    dialogVisible.value = false;
  }
}

async function handleMarkPaid_(invoice: InvoiceResponse): Promise<void> {
  const updated = await handleMarkPaid(invoice);
  if (updated) {
    dialogVisible.value = false;
  }
}

function handleDelete(invoice: InvoiceResponse): void {
  handleDeleteInvoice(invoice);
}

// Close the dialog when the current invoice is no longer in the list (deleted
// successfully). The confirmation flow keeps the dialog open until the backend
// confirms the deletion — the user can cancel the confirm without losing context.
watch(
  () => [invoices.value, dialogInvoice.value, deletingInvoiceId.value] as const,
  ([invoiceList, current, deletingId]) => {
    if (
      dialogVisible.value &&
      current &&
      deletingId === null &&
      !invoiceList.some((inv) => inv.id === current.id)
    ) {
      dialogVisible.value = false;
    }
  },
);

onMounted(fetchAll);
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="loading && !initialLoaded">
      <ManagementPageSkeleton variant="projects" />
    </template>

    <template v-else-if="loadError && !loading">
      <RequestErrorCard
        title="Failed to load invoices"
        :message="loadError"
        @retry="fetchAll"
      />
    </template>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Open Invoices"
          :value="stats.openInvoices"
          :description="stats.openInvoicesDescription"
        />
        <StatCard
          label="Billed This Month"
          :value="stats.billedThisMonth"
          :description="stats.billedThisMonthDescription"
        />
        <StatCard
          label="Drafts"
          :value="stats.drafts"
          :description="stats.draftsDescription"
        />
      </div>

      <SurfaceCard padding-class="p-6">
        <InvoicesTable
          :empty-description="emptyDescription"
          :filters="filters"
          :is-mobile-viewport="isMobileViewport"
          :loading="loading"
          :project-filter-options="projectFilterOptions"
          :rows="rows"
          :status-filter-options="statusFilterOptions"
          @create-invoice="handleCreateClick"
          @open-invoice="handleOpenInvoice"
          @update:filters="updateFilters"
        />
      </SurfaceCard>
    </template>

    <InvoiceDialog
      v-model:visible="dialogVisible"
      :mode="dialogMode"
      :invoice="dialogInvoice"
      :projects="projects"
      :saving="isDialogSaving"
      :is-admin="isAdmin"
      :deleting="isDialogDeleting"
      @create="handleCreate"
      @update-invoice="handleUpdateInvoice_"
      @send-invoice="handleSend"
      @mark-paid="handleMarkPaid_"
      @delete-invoice="handleDelete"
    />
  </div>
</template>