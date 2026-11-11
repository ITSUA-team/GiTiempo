<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { adminMutationInvalidationKeys } from '@/lib/query-keys';
import { useRouter } from 'vue-router';
import { WorkspaceRoles } from '@gitiempo/shared';
import {
  getErrorMessage,
  StatCard,
  SurfaceCard,
  useIsMobileViewport,
} from '@gitiempo/web-shared';
import Button from 'primevue/button';

import InvoiceMoveToolbar from '@/components/invoices/InvoiceMoveToolbar.vue';
import InvoiceGroups from '@/components/invoices/InvoiceGroups.vue';
import InvoicesTable from '@/components/invoices/InvoicesTable.vue';
import InvoiceCreateDialog from '@/components/invoices/InvoiceCreateDialog.vue';
import InvoiceListLoading from '@/components/invoices/InvoiceListLoading.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { invalidateQueryKeys, useAdminProjectsQuery } from '@/composables/query';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { useToasts } from '@/composables/feedback/useToasts';
import { useInvoiceDefaults } from '@/composables/invoices/useInvoiceDefaults';
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

const queryClient = useQueryClient();
const router = useRouter();
const authStore = useAuthStore();
const { errorToast } = useToasts();
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
const selectedGroup = ref<string | null>(null);
const selectedInvoices = ref<string[]>([]);
const groupsRefreshToken = ref(0);
const moveToolbar = ref<InstanceType<typeof InvoiceMoveToolbar>>();
const personalGroup = computed(() => personalGroups.value.find(group => group.id === selectedGroup.value));
const groupName = computed(() => personalGroup.value?.name ?? (selectedGroup.value === 'ungrouped' ? 'Ungrouped' : 'All invoices'));
const personalGroups = ref<Array<{id:string;name:string;count:number}>>([]);

const listQuery = computed(() => ({
  groupId: selectedGroup.value ?? undefined,
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

const invoiceRows = computed(() => invoices.value?.items ?? []);

watch([listQuery, scope], () => {selectedInvoices.value=[];});
watch(scope,()=>{selectedGroup.value=null;personalGroups.value=[];});

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

const {
  invoiceDefaultsQuery,
  workspaceCurrency,
  workspaceHourlyRate,
  workspaceRoundingStepMinutes,
} = useInvoiceDefaults({
  enabled: computed(() => Boolean(accessToken.value)),
  scope,
});

watch(
  () => invoiceDefaultsQuery.error.value,
  (error) => {
    if (error) {
      errorToast(getErrorMessage(error), {
        error,
        logContext: {
          action: 'load-invoice-defaults',
          feature: 'invoices',
        },
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
      description: `${statsData.byStatus.draft} ${statsData.byStatus.draft === 1 ? 'draft' : 'drafts'} · ${statsData.byStatus.sent} sent`,
      label: 'Open invoices',
      value: String(statsData.byStatus.draft + statsData.byStatus.sent),
    },
    {
      description: `Workspace invoices · ${statsData.thisMonth.currency}`,
      label: 'Billed this month',
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

async function refreshGroups(): Promise<void> {
  groupsRefreshToken.value++;
  await invalidateQueryKeys(queryClient, adminMutationInvalidationKeys.afterInvoiceGroupMutation(scope.value));
}

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

function selectGroup(group: string | null): void {
  selectedGroup.value = group;
  currentPage.value = 1;
}

function handleRowClick(invoiceId: string): void {
  router.push({ name: routeNames.invoiceDetail, params: { id: invoiceId } });
}

function handleCreateInvoice(): void {
  createDialogVisible.value = true;
}

// The mutation invalidates the invoice query keys, so no explicit refetch is needed.
function handleCreateSuccess(): void {
  createDialogVisible.value = false;
  groupsRefreshToken.value++;
}
</script>

<template>
  <div
    class="flex min-w-0 flex-col gap-3 sm:gap-6"
    data-testid="invoices-view"
  >
    <div
      v-if="statsCards && !isMobileViewport"
      class="grid h-[108px] grid-cols-3 gap-4"
      data-testid="invoices-stats"
    >
      <StatCard
        v-for="card in statsCards"
        :key="card.label"
        class="invoice-stat-card"
        :description="card.description"
        :label="card.label"
        :value="card.value"
      />
    </div>
    <div class="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-[208px_minmax(0,1fr)] sm:gap-5">
      <InvoiceGroups
        :scope="scope"
        :refresh-token="groupsRefreshToken"
        :selected-group="selectedGroup"
        @loaded="personalGroups=$event"
        @select="selectGroup"
        @moved="refreshGroups"
      />
      <div class="flex min-w-0 flex-col gap-4">
        <RequestErrorCard
          v-if="projectsError"
          title="Failed to load projects"
          :message="projectsErrorMessage"
          data-testid="invoices-projects-error"
          @retry="refetchProjects"
        />
        <InvoiceListLoading
          v-if="isInitialLoading"
          data-testid="invoices-page-skeleton"
        />
        <SurfaceCard
          v-else
          class="invoice-list-panel min-w-0"
          padding-class="p-0 sm:p-4"
        >
          <InvoicesTable
            v-model:selection="selectedInvoices"
            :empty-description="emptyStateDescription"
            :group-name="groupName"
            :personal-group="Boolean(personalGroup)"
            :empty-personal-group="Boolean(personalGroup) && !hasActiveFilters"
            :filter-options="filterOptions"
            :filters="filters"
            :is-mobile-viewport="isMobileViewport"
            :loading="invoicesLoading"
            :page="currentPage"
            :rows="invoiceRows"
            :rows-per-page="ROWS_PER_PAGE"
            :total-records="invoices?.meta.total ?? 0"
            @create-invoice="handleCreateInvoice"
            @row-click="handleRowClick"
            @browse-all="selectGroup(null)"
            @move-row="moveToolbar?.open([$event])"
            @update:filters="handleUpdateFilters"
            @update:page="handleUpdatePage"
          >
            <template #bulk-actions>
              <InvoiceMoveToolbar
                ref="moveToolbar"
                v-model:selection="selectedInvoices"
                :scope="scope"
                :query="listQuery"
                :rows="invoiceRows"
                :groups="personalGroups"
                @moved="refreshGroups"
              />
            </template>
            <template
              v-if="loadError"
              #error
            >
              <RequestErrorCard
                :title="selectedGroup ? 'Could not load this group' : 'Failed to load invoices'"
                :message="selectedGroup ? 'Your group selection and filters are saved. Try loading its invoices again.' : loadErrorMessage"
                retry-label="Retry"
                data-testid="invoices-load-error"
                @retry="fetchAll"
              />
              <Button
                v-if="hasActiveFilters"
                label="Clear filters"
                severity="secondary"
                variant="text"
                data-testid="invoices-clear-filters"
                @click="clearFilters"
              />
            </template>
          </InvoicesTable>
        </SurfaceCard>
      </div>
    </div>
    <InvoiceCreateDialog
      v-model:visible="createDialogVisible"
      :create-mutation="createMutation"
      :group-id="selectedGroup === 'ungrouped' ? null : selectedGroup"
      :is-admin="isAdmin"
      :projects="dialogProjects"
      :scope="scope"
      :workspace-currency="workspaceCurrency"
      :workspace-hourly-rate="workspaceHourlyRate"
      :workspace-rounding-step-minutes="workspaceRoundingStepMinutes"
      @created="handleCreateSuccess"
    />
  </div>
</template>
<style scoped>
.invoice-stat-card {
  line-height: 1.2;
  min-height: 0;
}
@media (max-width: 639px) {
  .invoice-list-panel {
    background: transparent;
    box-shadow: none;
  }
}
</style>
