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
      :pt="{
        root: { class: 'border-none bg-transparent' },
        tableContainer: { class: 'overflow-visible rounded-none border-none' },
        table: { class: 'w-full table-fixed border-collapse' },
        bodyRow: { class: 'h-[56px] bg-transparent hover:bg-transparent' },
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
