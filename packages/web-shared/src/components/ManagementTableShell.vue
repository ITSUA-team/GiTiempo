<script setup lang="ts">
export interface ManagementTableColumn {
  key: string;
  label: string;
  width?: number | "fill";
  align?: "start" | "end";
}

defineProps<{
  columns: ManagementTableColumn[];
}>();
</script>

<template>
  <div class="border-divider overflow-hidden rounded-[6px] border">
    <!-- Header row -->
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

    <!-- Body: consumer renders their DataTable here with class="gt-management-table" -->
    <slot />
  </div>
</template>
