<script setup lang="ts">
import DataTable from 'primevue/datatable';

import type { DataTableProps } from 'primevue/datatable';
import type { StyleValue } from 'vue';

import type { ManagementTableColumn } from './management-table';

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
    tableClass?: string;
    tableContainerClass?: string;
    tableContainerStyle?: StyleValue;
    value: unknown[];
  }>(),
  {
    bodyRowClass: 'h-[56px] bg-transparent hover:bg-transparent',
    headerClass:
      'border-divider bg-app-bg text-text-dark flex h-[44px] items-center border-b font-sans text-[13px] font-semibold',
    rowClass: undefined,
    shellClass: 'border-divider overflow-hidden rounded-[6px] border',
    showHeader: true,
    tableClass: 'w-full table-fixed border-collapse',
    tableContainerClass: 'overflow-visible rounded-none border-none',
    tableContainerStyle: undefined,
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
        class="px-3"
        :style="{
          width: col.width === 'fill' || col.width === undefined ? undefined : `${col.width}px`,
          flex: col.width === 'fill' || col.width === undefined ? '1' : undefined,
          textAlign: col.align ?? 'start',
        }"
      >
        {{ col.label }}
      </div>
    </div>

    <div
      v-if="$slots.filters"
      class="border-divider bg-surface text-text-muted flex h-[44px] items-center font-sans text-[12px] font-normal"
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
        tableContainer: { class: tableContainerClass, style: tableContainerStyle },
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
