<script setup lang="ts">
import DataTable from 'primevue/datatable';

import type { DataTableProps } from 'primevue/datatable';

import {
  getManagementTableColumnStyle,
  managementTableBodyRowClass,
  managementTableHeaderCellClass,
  managementTableHeaderClass,
  managementTableShellClass,
  type ManagementTableColumn,
} from './management-table';

withDefaults(
  defineProps<{
    bodyRowClass?: string;
    columns: ManagementTableColumn[];
    dataKey: string;
    headerClass?: string;
    loading: boolean;
    rowClass?: DataTableProps['rowClass'];
    shellClass?: string;
    showHeader?: boolean;
    singleScroll?: boolean;
    tableClass?: string;
    tableContainerClass?: string;
    value: unknown[];
  }>(),
  {
    bodyRowClass: managementTableBodyRowClass,
    headerClass: managementTableHeaderClass,
    rowClass: undefined,
    shellClass: managementTableShellClass,
    showHeader: true,
    singleScroll: false,
    tableClass: 'w-full table-fixed border-collapse',
    tableContainerClass: 'overflow-visible rounded-none border-none',
  },
);

const expandedRows = defineModel<Record<string, boolean> | undefined>('expandedRows');
</script>

<template>
  <div :class="shellClass">
    <div
      v-if="showHeader"
      :class="headerClass"
    >
      <div
        v-for="col in columns"
        :key="col.key"
        :class="[
          managementTableHeaderCellClass,
          col.align === 'end' ? 'justify-end text-right' : 'justify-start text-left',
        ]"
        :data-testid="`management-table-header-${col.key}`"
        :style="getManagementTableColumnStyle(col)"
      >
        {{ col.label }}
      </div>
    </div>

    <div
      v-if="$slots.filters"
      class="border-divider bg-surface-primary text-text-muted flex w-full shrink-0 items-center border-b py-3 font-sans text-[12px] font-normal"
    >
      <slot
        name="filters"
        :columns="columns"
      />
    </div>

    <DataTable
      v-model:expanded-rows="expandedRows"
      :value="value"
      :loading="loading"
      :show-headers="false"
      :data-key="dataKey"
      :row-class="rowClass"
      :pt="{
        root: { class: 'border-none bg-transparent' },
        tableContainer: {
          class: tableContainerClass,
          style: singleScroll ? { overflow: 'visible' } : undefined,
        },
        table: { class: tableClass },
        bodyRow: { class: bodyRowClass },
        rowExpansion: { style: 'height: auto;' },
        rowExpansionCell: { class: 'border-0 border-t border-divider p-0' },
        emptyMessageCell: { class: 'border-0 border-t border-divider p-0' },
      }"
    >
      <slot />

      <template #expansion="slotProps">
        <slot
          name="expansion"
          v-bind="slotProps"
        />
      </template>

      <template #empty>
        <slot name="empty" />
      </template>
    </DataTable>
  </div>
</template>
