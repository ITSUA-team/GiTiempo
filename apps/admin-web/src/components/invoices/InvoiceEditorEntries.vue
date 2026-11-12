<script setup lang="ts">
import { computed } from 'vue';
import type { InvoiceTimeDisplayMode, InvoiceTimeEntrySummary } from '@gitiempo/shared';
import { SurfaceCard } from '@gitiempo/web-shared';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import InvoiceEntrySelection from './InvoiceEntrySelection.vue';
import InvoiceTaskSelection from './InvoiceTaskSelection.vue';
import { formatInvoiceAmount } from '@/lib/format-currency';

const props = defineProps<{
  entries: InvoiceTimeEntrySummary[];
  unavailable: Array<{ id: string; label: string }>;
  state: 'initial' | 'loading' | 'error' | 'empty' | 'ready';
  currency?: string | null;
}>();
const selection = defineModel<string[]>({ required: true });
const timeDisplayMode = defineModel<InvoiceTimeDisplayMode>('timeDisplayMode', { default: 'entries' });
const modeOptions = [{ label: 'Time entry', value: 'entries' }, { label: 'Task', value: 'tasks' }];
defineEmits<{ retry: [] }>();
const included = computed(() => new Set(selection.value));
const count = computed(() => props.entries.filter(entry => included.value.has(entry.id)).length);

function dropEntry(id: string) {
  selection.value = selection.value.filter(selected => selected !== id);
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
        {{ timeDisplayMode === 'tasks' ? 'Tasks' : 'Time entries' }}
      </h2>
      <span
        v-if="state === 'ready' || state === 'empty'"
        class="text-brand text-xs font-medium"
      >{{ count }} of {{ entries.length }} included</span>
    </div>
    <div class="flex flex-col items-start gap-1.5">
      <span
        id="invoice-time-display-mode-label"
        class="text-text-dark text-xs font-semibold"
      >Show time by</span>
      <SelectButton
        v-model="timeDisplayMode"
        :allow-empty="false"
        size="small"
        aria-labelledby="invoice-time-display-mode-label"
        :options="modeOptions"
        option-label="label"
        option-value="value"
        class="invoice-time-mode"
        :pt="{
          root: { class: 'bg-surface-primary border-divider rounded-md border p-[3px]' },
          pcToggleButton: {
            root: { class: 'h-8 rounded-sm border-0 px-3.5 py-0 text-[13px] font-medium data-[p-checked=true]:font-semibold data-[p-checked=true]:bg-accent-tint data-[p-checked=true]:text-brand data-[p-checked=false]:bg-surface-primary data-[p-checked=false]:text-text-muted' },
            content: { class: 'bg-transparent p-0 shadow-none' },
          },
        }"
      />
    </div>
    <p
      class="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ count }} of {{ entries.length }} entries included.
    </p>
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
        <p class="text-text-muted text-xs">
          Uncheck an entry to exclude it. Tracked time is preserved.
        </p>
        <InvoiceTaskSelection
          v-if="timeDisplayMode === 'tasks'"
          v-model="selection"
          :entries="entries"
        />
        <InvoiceEntrySelection
          v-else
          v-model="selection"
          :entries="entries"
        />
        <p class="text-text-muted text-xs">
          Only eligible entries can be added. Entries linked to another invoice are unavailable.
        </p>
      </template>
    </template>
  </SurfaceCard>
</template>
