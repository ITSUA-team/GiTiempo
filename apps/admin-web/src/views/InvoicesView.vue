<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { WorkspaceRoles } from '@gitiempo/shared';
import {
  getErrorMessage,
  StatCard,
  SurfaceCard,
  useIsMobileViewport,
} from '@gitiempo/web-shared';
import Button from 'primevue/button';

import InvoicesTable from '@/components/invoices/InvoicesTable.vue';
import InvoiceCreateDialog from '@/components/invoices/InvoiceCreateDialog.vue';
import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useAdminProjectsQuery, useWorkspaceSettingsQuery } from '@/composables/query';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { getAdminSettingsClient } from '@/services/admin-settings-client';
import { useToasts } from '@/composables/feedback/useToasts';
import { useInvoiceCreate } from '@/composables/invoices/useInvoiceCreate';
import { useInvoicesData } from '@/composables/invoices/useInvoicesData';
import { routeNames } from '@/constants/routes';
import { formatCurrency } from '@/lib/format-currency';
import {
  INVOICE_STATUS_OPTIONS,
  type InvoicesTableFilterOptions,
  type InvoicesTableFilterUpdate,
  type InvoicesTableFilters,
} from '@/lib/invoices-table';
import { getAdminServerStateScope } from '@/lib/server-state-scope';
import { useAuthStore } from '@/stores/auth';

const ROWS_PER_PAGE = 20;

const router = useRouter();
const authStore = useAuthStore();
const { errorToast, successToast } = useToasts();
const isMobileViewport = useIsMobileViewport();

const accessToken = computed(() => authStore.accessToken);
const scope = computed(() => getAdminServerStateScope(accessToken.value));
const isAdmin = computed(
  () => authStore.profile?.role === WorkspaceRoles.Admin,
);

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

const filters = ref<InvoicesTableFilters>({
  dateFrom: null,
  dateTo: null,
  projectId: null,
  search: '',
  status: null,
});
const currentPage = ref(1);

const listQuery = computed(() => ({
  dateFrom: filters.value.dateFrom ?? undefined,
  dateTo: filters.value.dateTo ?? undefined,
  limit: ROWS_PER_PAGE,
  page: currentPage.value,
  projectId: filters.value.projectId ?? undefined,
  search: filters.value.search || undefined,
  status: filters.value.status ?? undefined,
}));

const {
  initialLoaded,
  invoices,
  invoicesLoading,
  loadError,
  refetch,
  stats,
} = useInvoicesData({
  enabled: computed(() => Boolean(accessToken.value)),
  onError: notifyInvoicesError,
  query: listQuery,
  scope,
});

// initialLoaded flips back to false while a changed query key refetches; track
// the first successful load so filter/page changes don't re-show the page
// skeleton. Later fetches are surfaced through the table's loading state.
const hasInitiallyLoaded = ref(false);

watch(
  initialLoaded,
  (loaded) => {
    if (loaded) {
      hasInitiallyLoaded.value = true;
    }
  },
  { immediate: true },
);

const isInitialLoading = computed(
  () => !hasInitiallyLoaded.value && !loadError.value,
);

const projectsQuery = useAdminProjectsQuery({
  client: adminProjectsClient,
  enabled: computed(() => Boolean(accessToken.value)),
  scope,
});

const projectsError = computed(() => projectsQuery.error.value);

const projectsErrorMessage = computed(() =>
  projectsError.value ? getErrorMessage(projectsError.value) : '',
);

watch(
  () => projectsQuery.error.value,
  (error) => {
    if (error) {
      errorToast(getErrorMessage(error), {
        error,
        logContext: { action: 'load-projects', feature: 'invoices' },
      });
    }
  },
);

const workspaceSettingsQuery = useWorkspaceSettingsQuery({
  client: getAdminSettingsClient(),
  enabled: computed(() => Boolean(accessToken.value)),
  scope,
});

const workspaceCurrency = computed(
  () => workspaceSettingsQuery.data.value?.currency ?? null,
);

const workspaceRoundingStepMinutes = computed(
  () => workspaceSettingsQuery.data.value?.timeRoundingStepMinutes ?? null,
);

watch(
  () => workspaceSettingsQuery.error.value,
  (error) => {
    if (error) {
      errorToast(getErrorMessage(error), {
        error,
        logContext: { action: 'load-workspace-settings', feature: 'invoices' },
      });
    }
  },
);

const loadErrorMessage = computed(() =>
  loadError.value ? getErrorMessage(loadError.value) : '',
);

const hasActiveFilters = computed(() => {
  const f = filters.value;
  return Boolean(f.search || f.projectId || f.status || f.dateFrom || f.dateTo);
});

const emptyStateDescription = computed(() =>
  hasActiveFilters.value
    ? 'No invoices match the current filters.'
    : 'No invoices found. Create your first invoice to get started.',
);

const createDialogVisible = ref(false);

const createMutation = useInvoiceCreate({
  onError: notifyInvoicesError,
  scope,
});

const filterOptions = computed<InvoicesTableFilterOptions>(() => ({
  projects: (projectsQuery.data.value ?? []).map((p) => ({
    id: p.id,
    name: p.name,
  })),
  statuses: INVOICE_STATUS_OPTIONS,
}));

const dialogProjects = computed(() =>
  (projectsQuery.data.value ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    timeRoundingStepMinutes: p.timeRoundingStepMinutes,
  })),
);

const statsCards = computed(() => {
  const statsData = stats.value;
  if (!statsData) return null;

  return [
    {
      description: `${statsData.byStatus.draft} ready to send`,
      label: 'Open Invoices',
      value: String(statsData.byStatus.draft + statsData.byStatus.sent),
    },
    {
      description: `${statsData.thisMonth.invoiceCount} invoices · ${statsData.thisMonth.projectCount} projects`,
      label: 'Billed This Month',
      value: formatCurrency(
        statsData.thisMonth.totalAmount,
        statsData.thisMonth.currency,
      ),
    },
    {
      description: 'Ready for review',
      label: 'Drafts',
      value: String(statsData.byStatus.draft),
    },
  ];
});

async function fetchAll(): Promise<void> {
  await refetch();
}

async function refetchProjects(): Promise<void> {
  await projectsQuery.refetch({ throwOnError: false });
}

function handleUpdateFilters(update: InvoicesTableFilterUpdate): void {
  if (update.search !== undefined) filters.value.search = update.search;
  if (update.projectId !== undefined) filters.value.projectId = update.projectId;
  if (update.status !== undefined) filters.value.status = update.status;
  if (update.dateFrom !== undefined) filters.value.dateFrom = update.dateFrom;
  if (update.dateTo !== undefined) filters.value.dateTo = update.dateTo;
  currentPage.value = 1;
}

function clearFilters(): void {
  filters.value = {
    dateFrom: null,
    dateTo: null,
    projectId: null,
    search: '',
    status: null,
  };
  currentPage.value = 1;
}

function handleUpdatePage(page: number): void {
  currentPage.value = page;
}

function handleRowClick(invoiceId: string): void {
  router.push({ name: routeNames.invoiceDetail, params: { id: invoiceId } });
}

function handleCreateInvoice(): void {
  createDialogVisible.value = true;
}

// Success side effects (toast) belong to the view: the dialog closes itself
// via update:visible, and the mutation's onSuccess hook already invalidates
// the invoice query keys, so the list refetches without an explicit refetch.
function handleCreateSuccess(): void {
  createDialogVisible.value = false;
  successToast('Invoice created');
}
</script>

<template>
  <div
    class="flex flex-col gap-6"
    data-testid="invoices-view"
  >
    <ManagementPageSkeleton
      v-if="isInitialLoading"
      variant="invoices"
    />

    <div
      v-else-if="loadError"
      class="flex flex-col gap-4"
    >
      <RequestErrorCard
        title="Failed to load invoices"
        :message="loadErrorMessage"
        data-testid="invoices-load-error"
        @retry="fetchAll"
      />
      <div
        v-if="hasActiveFilters"
        class="flex justify-center"
      >
        <Button
          label="Clear filters"
          severity="secondary"
          variant="text"
          data-testid="invoices-clear-filters"
          @click="clearFilters"
        />
      </div>
    </div>

    <template v-else>
      <div
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        data-testid="invoices-stats"
      >
        <StatCard
          v-for="card in statsCards"
          :key="card.label"
          :description="card.description"
          :label="card.label"
          :value="card.value"
        />
      </div>

      <RequestErrorCard
        v-if="projectsError"
        title="Failed to load projects"
        :message="projectsErrorMessage"
        data-testid="invoices-projects-error"
        @retry="refetchProjects"
      />

      <SurfaceCard padding-class="p-6">
        <InvoicesTable
          :empty-description="emptyStateDescription"
          :filter-options="filterOptions"
          :filters="filters"
          :is-mobile-viewport="isMobileViewport"
          :loading="invoicesLoading"
          :page="currentPage"
          :rows="invoices?.items ?? []"
          :rows-per-page="ROWS_PER_PAGE"
          :total-records="invoices?.meta.total ?? 0"
          @create-invoice="handleCreateInvoice"
          @row-click="handleRowClick"
          @update:filters="handleUpdateFilters"
          @update:page="handleUpdatePage"
        />
      </SurfaceCard>
    </template>

    <InvoiceCreateDialog
      v-model:visible="createDialogVisible"
      :create-mutation="createMutation"
      :is-admin="isAdmin"
      :projects="dialogProjects"
      :scope="scope"
      :workspace-currency="workspaceCurrency"
      :workspace-rounding-step-minutes="workspaceRoundingStepMinutes"
      @created="handleCreateSuccess"
    />
  </div>
</template>