<script setup lang="ts">
import { computed } from 'vue';
import type { InvoiceTimeEntrySummary } from '@gitiempo/shared';
import { useIsMobileViewport } from '@gitiempo/web-shared';
import { formatCompactDuration } from '@gitiempo/web-shared/time';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';

const props = withDefaults(defineProps<{
  entries: InvoiceTimeEntrySummary[];
  selectAllLabel?: string;
  tableTestId?: string;
}>(), {
  selectAllLabel: 'Include all entries',
  tableTestId: 'invoice-create-preview-table',
});
const selection = defineModel<string[]>({ required: true });
const mobile = useIsMobileViewport();
const included = computed(() => new Set(selection.value));
const count = computed(() => props.entries.filter(entry => included.value.has(entry.id)).length);
const allChecked = computed(() => count.value > 0 && count.value === props.entries.length);

function toggleAll() {
  const ids = new Set(props.entries.map(entry => entry.id));
  const outside = selection.value.filter(id => !ids.has(id));
  selection.value = allChecked.value ? outside : [...outside, ...ids];
}

function label(entry: InvoiceTimeEntrySummary) {
  return [entry.taskName, entry.description].filter(Boolean).join(' · ') || 'Time entry';
}
function selectionLabel(entry: InvoiceTimeEntrySummary) {
  return `Include ${label(entry)} · ${entryDate.format(new Date(entry.startedAt))} · ${entry.userName || 'Unknown user'} · ${formatCompactDuration(entry.roundedDurationSeconds)}`;
}
const entryDate = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric',
});
const columnPt = {
  headerCell: { class: 'h-9 bg-app-bg px-3 py-1 text-left text-xs font-semibold text-text-dark' },
  bodyCell: { class: 'h-[42px] border-b border-divider px-3 py-1 text-[13px] text-text-dark' },
};
function entryRowClass(entry: InvoiceTimeEntrySummary) {
  return included.value.has(entry.id) ? 'bg-surface-primary' : 'bg-app-bg';
}
</script>

<template>
  <template v-if="mobile">
    <article
      v-for="entry in entries"
      :key="entry.id"
      class="bg-app-bg flex min-h-28 items-center gap-3 rounded-sm p-2.5"
    >
      <Checkbox
        v-model="selection"
        :pt="{ root: { class: 'h-[18px] w-[18px]' }, box: { class: 'h-[18px] w-[18px]' } }"
        :value="entry.id"
        :aria-label="selectionLabel(entry)"
      />
      <div class="text-text-dark flex min-w-0 flex-col gap-1 text-[13px] break-words">
        <span class="font-medium">{{ entry.taskName || 'Time entry' }}</span>
        <span class="text-text-muted text-[11px]">{{ entryDate.format(new Date(entry.startedAt)) }} · {{ entry.userName || '—' }}</span>
        <span class="text-text-muted text-xs">{{ entry.description || '—' }}</span>
        <span
          class="text-xs font-medium"
          :class="included.has(entry.id) ? 'text-brand' : 'text-text-muted'"
        >{{ included.has(entry.id) ? 'Included' : 'Excluded' }} · {{ formatCompactDuration(entry.roundedDurationSeconds) }}</span>
      </div>
    </article>
  </template>
  <DataTable
    v-else
    :value="entries"
    data-key="id"
    :data-testid="tableTestId"
    :row-class="entryRowClass"
    size="small"
    scrollable
    scroll-height="18rem"
    table-style="width:100%;table-layout:fixed"
  >
    <Column
      :pt="columnPt"
      style="width:42px"
    >
      <template #header>
        <Checkbox
          binary
          :model-value="allChecked"
          :indeterminate="count > 0 && !allChecked"
          :pt="{ root: { class: 'h-[18px] w-[18px]' }, box: { class: 'h-[18px] w-[18px]' }, input: { 'aria-checked': count > 0 && !allChecked ? 'mixed' : allChecked } }"
          :aria-label="selectAllLabel"
          @update:model-value="toggleAll"
        />
      </template>
      <template #body="{data}">
        <Checkbox
          v-model="selection"
          :value="data.id"
          :pt="{ root: { class: 'h-[18px] w-[18px]' }, box: { class: 'h-[18px] w-[18px]' } }"
          :aria-label="selectionLabel(data)"
        />
      </template>
    </Column>
    <Column
      header="Date"
      style="width:114px"
      :pt="{ ...columnPt, bodyCell: { class: columnPt.bodyCell.class + ' text-xs text-text-dark' } }"
    >
      <template #body="{data}">
        {{ entryDate.format(new Date(data.startedAt)) }}
      </template>
    </Column>
    <Column
      :pt="columnPt"
      header="Task / description"
    >
      <template #body="{data}">
        <span
          class="break-words whitespace-normal"
          :class="{ 'text-text-muted': !included.has(data.id) }"
        >{{ label(data) }}</span>
      </template>
    </Column>
    <Column
      :pt="columnPt"
      header="User"
      style="width:152px"
    >
      <template #body="{data}">
        {{ data.userName || '—' }}
      </template>
    </Column>
    <Column
      :pt="columnPt"
      header="Billed time"
      style="width:97px"
    >
      <template #body="{data}">
        {{ formatCompactDuration(data.roundedDurationSeconds) }}
      </template>
    </Column>
  </DataTable>
</template>
