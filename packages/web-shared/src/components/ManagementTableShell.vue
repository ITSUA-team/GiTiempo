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
  <div class="gt-table-shell">
    <!-- Header row: bg-app-bg, 44px height, Inter 600 13px text-dark -->
    <div class="gt-table-header">
      <div
        v-for="col in columns"
        :key="col.key"
        class="gt-table-header-cell"
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

<style scoped>
.gt-table-shell {
  border: 1px solid #eeeeee;
  border-radius: 6px;
  overflow: hidden;
}

.gt-table-header {
  display: flex;
  align-items: center;
  background-color: #f4f4f5;
  height: 44px;
  border-bottom: 1px solid #eeeeee;
  font-family: "Inter", sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.gt-table-header-cell {
  padding: 0 12px;
}

/* Strip ALL PrimeVue DataTable default chrome */
:deep(.gt-management-table.p-datatable) {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
}

:deep(.gt-management-table .p-datatable-table-container) {
  border: none !important;
  border-radius: 0 !important;
  overflow: visible !important;
}

:deep(.gt-management-table table) {
  border-collapse: collapse !important;
  width: 100% !important;
}

/* Body rows: height 56px, no background */
:deep(
  .gt-management-table .p-datatable-tbody > tr:not(.p-datatable-row-expansion)
) {
  height: 56px !important;
  background: transparent !important;
}

:deep(
  .gt-management-table
    .p-datatable-tbody
    > tr:not(.p-datatable-row-expansion):hover
) {
  background: transparent !important;
}

/* Body cells: padding [0,12], top border */
:deep(
  .gt-management-table
    .p-datatable-tbody
    > tr:not(.p-datatable-row-expansion)
    > td
) {
  padding: 0 12px !important;
  border: none !important;
  border-top: 1px solid #eeeeee !important;
  vertical-align: middle !important;
  font-family: "Inter", sans-serif !important;
}

/* Expansion row: auto height */
:deep(.gt-management-table .p-datatable-row-expansion) {
  height: auto !important;
}

/* Expansion cell: zero padding, flush edge-to-edge */
:deep(.gt-management-table .p-datatable-row-expansion > td) {
  padding: 0 !important;
  border: none !important;
  border-top: 1px solid #eeeeee !important;
}

/*
 * Action link-buttons — override PrimeVue Button link variant chrome.
 * Design: padding 4px 6px, Inter 600 13px, no underline.
 */
:deep(.gt-action-btn.p-button) {
  padding: 4px 6px !important;
  font-family: "Inter", sans-serif !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  line-height: 1 !important;
  border-radius: 4px !important;
  text-decoration: none !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

:deep(.gt-action-btn--brand.p-button) {
  color: #5d2b85 !important;
}

:deep(.gt-action-btn--destructive.p-button) {
  color: #d32f2f !important;
}

:deep(.gt-action-btn--muted.p-button) {
  color: #666666 !important;
}
</style>
