<script setup lang="ts">
import DataTable from 'primevue/datatable';

export interface ManagementTableColumn {
  key: string;
  label: string;
  width?: number | 'fill';
  align?: 'start' | 'end';
}

defineProps<{
  columns: ManagementTableColumn[];
  dataKey: string;
  loading: boolean;
  value: unknown[];
}>();

const expandedRows = defineModel<Record<string, boolean> | undefined>('expandedRows');
</script>

<template>
  <div class="border-divider overflow-hidden rounded-[6px] border">
    <div class="border-divider bg-app-bg text-text-dark flex h-[44px] items-center border-b font-sans text-[13px] font-semibold">
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

    <DataTable
      v-model:expanded-rows="expandedRows"
      :value="value"
      :loading="loading"
      :show-headers="false"
      :data-key="dataKey"
      class="gt-management-table"
      :pt="{
        rowExpansion: { style: 'height: auto;' },
      }"
    >
      <slot />

      <template #expansion="slotProps">
        <slot name="expansion" v-bind="slotProps" />
      </template>

      <template #empty>
        <slot name="empty" />
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
:deep(.gt-management-table.p-datatable) {
  background: transparent;
  border: none;
  border-radius: 0;
}

:deep(.gt-management-table .p-datatable-table-container) {
  border: none;
  border-radius: 0;
  overflow: visible;
}

:deep(.gt-management-table table) {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

:deep(.gt-management-table .p-datatable-tbody > tr:not(.p-datatable-row-expansion)) {
  height: 56px;
  background: transparent;
}

:deep(.gt-management-table .p-datatable-tbody > tr:not(.p-datatable-row-expansion):hover) {
  background: transparent;
}

:deep(.gt-management-table .p-datatable-tbody > tr:not(.p-datatable-row-expansion) > td) {
  padding: 0 12px;
  border: none;
  border-top: 1px solid var(--color-divider);
  vertical-align: middle;
  font-family: 'Inter', sans-serif;
}

:deep(.gt-management-table .p-datatable-row-expansion) {
  height: auto;
}

:deep(.gt-management-table .p-datatable-row-expansion > td) {
  padding: 0;
  border: none;
  border-top: 1px solid var(--color-divider);
}
</style>
