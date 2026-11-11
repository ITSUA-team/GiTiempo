<script setup lang="ts">
import { computed } from 'vue';
import type { InvoiceTimeEntrySummary } from '@gitiempo/shared';
import { SurfaceCard, useIsMobileViewport } from '@gitiempo/web-shared';
import { formatCompactDuration } from '@gitiempo/web-shared/time';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import { formatInvoiceAmount } from '@/lib/format-currency';

const props = defineProps<{
  entries: InvoiceTimeEntrySummary[];
  unavailable: Array<{ id: string; label: string }>;
  state: 'initial' | 'loading' | 'error' | 'empty' | 'ready';
  currency?: string | null;
}>();
const selection = defineModel<string[]>({ required: true });
defineEmits<{ retry: [] }>();
const mobile = useIsMobileViewport();
const included = computed(() => new Set(selection.value));
const count = computed(() => props.entries.filter(entry => included.value.has(entry.id)).length);
const allChecked = computed(() => count.value > 0 && count.value === props.entries.length);

function toggleAll() {
  const unavailableIds = props.unavailable.map(entry => entry.id);
  selection.value = allChecked.value ? unavailableIds : [...unavailableIds, ...props.entries.map(entry => entry.id)];
}

function label(entry: InvoiceTimeEntrySummary) {
  return [entry.taskName, entry.description].filter(Boolean).join(' · ') || 'Time entry';
}

function dropEntry(id: string) {
  selection.value = selection.value.filter(selected => selected !== id);
}

const entryDate = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric',
});
const columnPt = {
  headerCell: { class: 'h-9 bg-app-bg px-3 py-1 text-left text-xs font-semibold' },
  bodyCell: { class: 'h-[42px] border-b border-divider px-3 py-1 text-[13px]' },
};
function entryRowClass(entry: InvoiceTimeEntrySummary) {
  return included.value.has(entry.id) ? 'bg-surface-primary' : 'bg-app-bg text-text-muted';
}
</script>

<template>
  <SurfaceCard
    id="invoice-editor-entries"
    tabindex="-1"
    border
    padding-class="p-4"
    body-class="flex flex-col gap-2"
  >
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-text-dark text-lg font-semibold">
        Time entries
      </h2>
      <span
        v-if="state === 'ready' || state === 'empty'"
        class="text-text-muted text-[13px]"
      >{{ count }} of {{ entries.length }} included</span>
    </div>
    <p
      v-if="state === 'initial'"
      data-testid="invoice-create-preview-hint"
      class="text-text-muted text-[13px]"
    >
      Select a date range to preview eligible time entries.
    </p>
    <p
      v-else-if="state === 'loading'"
      data-testid="invoice-create-preview-loading"
      role="status"
    >
      Loading preview…
    </p>
    <div
      v-else-if="state === 'error'"
      data-testid="invoice-create-preview-error"
      role="alert"
    >
      Failed to load eligible entries. Please try again.
      <Button
        label="Retry"
        severity="secondary"
        @click="$emit('retry')"
      />
    </div>
    <template v-else>
      <div
        v-for="entry in unavailable"
        :key="entry.id"
        class="border-destructive flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
        role="alert"
      >
        <span>{{ entry.label }} · Unavailable</span>
        <Button
          label="Exclude entry"
          severity="secondary"
          size="small"
          @click="dropEntry(entry.id)"
        />
      </div>
      <div
        v-if="state === 'empty'"
        data-testid="invoice-create-preview-empty"
        class="flex flex-col gap-4 py-2"
      >
        <h3 class="text-base font-semibold">
          No billable entries found
        </h3>
        <p class="text-text-muted text-sm">
          Change the project or billing period to look for entries. You can still create an empty draft.
        </p>
        <p
          v-if="currency && !unavailable.length"
          class="flex justify-between gap-3 text-sm"
        >
          <span>0 entries · 0h</span><span>{{ formatInvoiceAmount(0, currency) }}</span>
        </p>
      </div>
      <template v-else>
        <p class="text-text-muted text-[13px]">
          Uncheck an entry to exclude it. Tracked time is preserved.
        </p>
        <template v-if="mobile">
          <article
            v-for="entry in entries"
            :key="entry.id"
            class="border-divider flex min-h-28 items-start gap-3 rounded-lg border p-2.5"
            :class="entryRowClass(entry)"
          >
            <Checkbox
              v-model="selection"
              :value="entry.id"
              :aria-label="'Include ' + label(entry)"
            />
            <div class="flex min-w-0 flex-col gap-1 text-[13px] break-words">
              <strong>{{ entry.taskName || 'Time entry' }}</strong>
              <span class="text-text-muted">{{ entryDate.format(new Date(entry.startedAt)) }} · {{ entry.userName || '—' }}</span>
              <span>{{ entry.description || '—' }}</span>
              <span :class="included.has(entry.id) ? 'text-brand' : 'text-text-muted'">{{ included.has(entry.id) ? 'Included' : 'Excluded' }} · {{ formatCompactDuration(entry.roundedDurationSeconds) }}</span>
            </div>
          </article>
        </template>
        <DataTable
          v-else
          :value="entries"
          data-key="id"
          data-testid="invoice-create-preview-table"
          :row-class="entryRowClass"
          size="small"
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
                aria-label="Include all entries"
                @update:model-value="toggleAll"
              />
            </template>
            <template #body="{data}">
              <Checkbox
                v-model="selection"
                :value="data.id"
                :aria-label="'Include ' + label(data)"
              />
            </template>
          </Column>
          <Column
            :pt="columnPt"
            header="Date"
            style="width:114px"
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
              <span class="break-words whitespace-normal">{{ label(data) }}</span>
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
        <p class="text-text-muted text-xs">
          Only eligible entries can be added. Entries linked to another invoice are unavailable.
        </p>
      </template>
    </template>
  </SurfaceCard>
</template>
