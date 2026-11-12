<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { groupInvoiceTimeByTask, type InvoiceTimeEntrySummary } from '@gitiempo/shared';
import { formatCompactDuration } from '@gitiempo/web-shared/time';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';
import Button from 'primevue/button';
import InvoiceEntrySelection from './InvoiceEntrySelection.vue';

const props = defineProps<{ entries: InvoiceTimeEntrySummary[] }>();
const selection = defineModel<string[]>({ required: true });
const expanded = ref(new Set<string>());
const regionId = useId();
const included = computed(() => new Set(selection.value));
const groups = computed(() => groupInvoiceTimeByTask(props.entries).map(group => {
  const selected = group.entries.filter(entry => included.value.has(entry.id));
  return {
    ...group,
    includedCount: selected.length,
    includedSeconds: selected.reduce((sum, entry) => sum + entry.roundedDurationSeconds, 0),
  };
}));
function toggle(taskId: string) {
  const next = new Set(expanded.value);
  if (next.has(taskId)) next.delete(taskId);
  else next.add(taskId);
  expanded.value = next;
}
</script>

<template>
  <div
    class="flex flex-col gap-2"
    data-testid="invoice-task-selection"
  >
    <section
      v-for="group in groups"
      :key="group.taskId"
      class="flex min-w-0 flex-col gap-2"
      :data-task-id="group.taskId"
    >
      <Button
        severity="secondary"
        variant="text"
        class="text-text-dark bg-app-bg flex w-full items-center justify-start gap-2.5 rounded-sm px-3 py-2 text-left"
        :aria-label="`${expanded.has(group.taskId) ? 'Collapse' : 'Expand'} ${group.taskName}`"
        :aria-expanded="expanded.has(group.taskId)"
        :aria-controls="`${regionId}-${group.taskId}`"
        @click="toggle(group.taskId)"
      >
        <component
          :is="expanded.has(group.taskId) ? ChevronDownIcon : ChevronRightIcon"
          class="text-brand h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <span class="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
          <span class="min-w-0 text-sm font-semibold break-words">{{ group.taskName }}</span>
          <span class="text-text-muted text-xs font-medium">{{ group.includedCount }} of {{ group.entries.length }} {{ group.entries.length === 1 ? 'entry' : 'entries' }} included</span>
        </span>
        <span class="text-brand ml-2 shrink-0 text-sm font-semibold">{{ formatCompactDuration(group.includedSeconds) }}</span>
      </Button>
      <div
        v-show="expanded.has(group.taskId)"
        :id="`${regionId}-${group.taskId}`"
        :aria-label="`${group.taskName} entries`"
        class="flex flex-col gap-2"
        role="region"
      >
        <InvoiceEntrySelection
          v-if="expanded.has(group.taskId)"
          v-model="selection"
          :entries="group.entries"
          :select-all-label="`Include all entries in ${group.taskName}`"
          table-test-id="invoice-task-entry-table"
        />
      </div>
    </section>
  </div>
</template>
