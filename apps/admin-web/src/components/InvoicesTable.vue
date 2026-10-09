<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/outline';
import { computed } from 'vue';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';

import {
  EmptyStateBlock,
  ManagementTableEmptyState,
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  managementTableColumnPt,
  type ManagementTableColumn,
} from '@gitiempo/web-shared';

import MobileRecordMetadataList from '@/components/MobileRecordMetadataList.vue';
import {
  formatInvoiceAmount,
  getInvoiceStatusLabel,
  getInvoiceStatusSeverity,
} from '@/lib/invoice-display';
import type {
  InvoiceProjectFilterOption,
  InvoiceStatusOption,
  InvoiceTableFilters,
  InvoiceTableRow,
} from '@/composables/useInvoicesTableState';

const props = defineProps<{
  emptyDescription: string;
  filters: InvoiceTableFilters;
  isMobileViewport: boolean;
  loading: boolean;
  projectFilterOptions: InvoiceProjectFilterOption[];
  rows: InvoiceTableRow[];
  statusFilterOptions: InvoiceStatusOption[];
}>();

const emit = defineEmits<{
  'create-invoice': [];
  'open-invoice': [row: InvoiceTableRow];
  'update:filters': [filters: Partial<InvoiceTableFilters>];
}>();

const columns: ManagementTableColumn[] = [
  { key: 'title', label: 'Invoice', width: 'fill' },
  { key: 'project', label: 'Project', width: 200 },
  { key: 'amount', label: 'Amount', width: 140, align: 'end' },
  { key: 'status', label: 'Status', width: 120 },
];

const projectSelectOptions = computed(() => [
  { id: null as string | null, name: 'All projects' },
  ...props.projectFilterOptions,
]);

const projectSelectModel = computed({
  get: () =>
    projectSelectOptions.value.find((opt) => opt.id === props.filters.projectId) ??
    projectSelectOptions.value[0],
  set: (value: InvoiceProjectFilterOption | undefined) => {
    if (!value) return;
    emit('update:filters', { projectId: value.id });
  },
});

const statusSelectModel = computed({
  get: () =>
    props.statusFilterOptions.find(
      (opt) => opt.value === props.filters.status,
    ) ?? props.statusFilterOptions[0],
  set: (value: InvoiceStatusOption | undefined) => {
    if (!value) return;
    emit('update:filters', {
      status: value.value === null ? null : (value.value as InvoiceTableRow['status']),
    });
  },
});

function updateGlobalFilter(value: string | undefined): void {
  emit('update:filters', { global: value ?? '' });
}

function openInvoice(row: InvoiceTableRow): void {
  emit('open-invoice', row);
}

function handleCreate(): void {
  emit('create-invoice');
}
</script>

<template>
  <div>
    <div class="mb-4">
      <SectionHeader title="Invoice List">
        <template #actions>
          <div class="flex w-full items-center gap-3 sm:w-auto">
            <IconField class="w-full sm:w-[260px]">
              <InputIcon class="pi pi-search text-text-muted" />
              <InputText
                :model-value="filters.global"
                aria-label="Search invoices"
                class="w-full"
                placeholder="Search invoices"
                @update:model-value="updateGlobalFilter"
              />
            </IconField>
            <Button
              data-testid="invoices-table-create"
              aria-label="Create invoice"
              size="small"
              @click="handleCreate"
            >
              <template #icon>
                <PlusIcon
                  class="size-4"
                  aria-hidden="true"
                />
              </template>
              Create invoice
            </Button>
          </div>
        </template>
      </SectionHeader>
    </div>

    <!-- Mobile -->
    <div
      v-if="isMobileViewport"
      class="flex flex-col gap-3"
    >
      <template v-if="loading && rows.length === 0">
        <MobileRecordCard
          v-for="index in 4"
          :key="`invoice-skeleton-${index}`"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton
                width="10rem"
                height="1rem"
              />
              <Skeleton
                width="8rem"
                height="0.875rem"
              />
            </div>
            <Skeleton
              width="4rem"
              height="1.5rem"
            />
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-2">
              <Skeleton
                width="4rem"
                height="0.75rem"
              />
              <Skeleton
                width="5rem"
                height="0.875rem"
              />
            </div>
            <div class="flex flex-col gap-2">
              <Skeleton
                width="4rem"
                height="0.75rem"
              />
              <Skeleton
                width="5rem"
                height="0.875rem"
              />
            </div>
          </div>
        </MobileRecordCard>
      </template>

      <template v-else-if="rows.length > 0">
        <MobileRecordCard
          v-for="row in rows"
          :key="row.id"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <Button
                :pt="{
                  root: {
                    class:
                      'h-auto min-w-0 border-none bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2',
                  },
                }"
                type="button"
                @click="openInvoice(row)"
              >
                <span class="text-text-dark text-sm font-semibold">{{ row.title }}</span>
              </Button>
              <p class="text-text-muted text-[13px]">
                {{ row.projectName }}
              </p>
            </div>
            <Tag
              :severity="getInvoiceStatusSeverity(row.status)"
              :value="getInvoiceStatusLabel(row.status)"
              :pt="{ root: 'rounded-sm px-2 py-0.5 text-xs font-medium' }"
            />
          </div>
          <MobileRecordMetadataList
            :items="[
              { label: 'Amount', value: formatInvoiceAmount(row.totalAmount, row.currency) },
              { label: 'Date range', value: `${row.dateFrom} — ${row.dateTo}` },
            ]"
          />
        </MobileRecordCard>
      </template>

      <EmptyStateBlock
        v-else
        title="No invoices"
        :description="emptyDescription"
      />
    </div>

    <!-- Desktop -->
    <ManagementTableShell
      v-else
      :columns="columns"
      data-key="id"
      :loading="loading"
      :value="rows"
    >
      <template #filters>
        <div class="flex w-full items-center gap-3 px-3 py-2">
          <div class="min-w-0 flex-1">
            <Select
              v-model="projectSelectModel"
              :options="projectSelectOptions"
              option-label="name"
              option-value="id"
              class="w-full"
              aria-label="Filter by project"
            />
          </div>
          <div class="w-[160px]">
            <Select
              v-model="statusSelectModel"
              :options="statusFilterOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              aria-label="Filter by status"
            />
          </div>
        </div>
      </template>

      <Column :pt="managementTableColumnPt">
        <template #body="{ data }">
          <Button
            :pt="{
              root: {
                class:
                  'h-auto min-w-0 border-none bg-transparent p-0 text-left shadow-none hover:bg-transparent focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2',
              },
            }"
            type="button"
            @click="openInvoice(data)"
          >
            <span class="text-text-dark text-sm font-semibold">{{ data.title }}</span>
          </Button>
        </template>
      </Column>

      <Column :pt="managementTableColumnPt">
        <template #body="{ data }">
          <span class="text-text-muted text-[13px] font-normal">{{ data.projectName }}</span>
        </template>
      </Column>

      <Column
        :pt="managementTableColumnPt"
        align="end"
      >
        <template #body="{ data }">
          <span class="text-text-dark text-[13px] font-semibold">{{ formatInvoiceAmount(data.totalAmount, data.currency) }}</span>
        </template>
      </Column>

      <Column :pt="managementTableColumnPt">
        <template #body="{ data }">
          <Tag
            :severity="getInvoiceStatusSeverity(data.status)"
            :value="getInvoiceStatusLabel(data.status)"
            :pt="{ root: 'rounded-sm px-2 py-0.5 text-xs font-medium' }"
          />
        </template>
      </Column>

      <template #empty>
        <ManagementTableEmptyState
          title="No invoices"
          :description="emptyDescription"
        />
      </template>
    </ManagementTableShell>
  </div>
</template>