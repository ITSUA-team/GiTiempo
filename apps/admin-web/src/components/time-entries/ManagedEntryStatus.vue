<script setup lang="ts">
import { computed } from 'vue';
import type { TimeEntryResponse } from '@gitiempo/shared';
import Tag from 'primevue/tag';

const props = defineProps<{ entry: TimeEntryResponse; part?: 'status' | 'reason' }>();
const state = computed(() => {
  if (!props.entry.endedAt) return { label: 'Running', reason: 'Stop timer to edit', severity: 'success' };
  if (props.entry.invoiceId) return { label: 'Invoiced', reason: 'Included in invoice', severity: 'info' };
  return { label: 'Completed', reason: '', severity: 'secondary' };
});
</script>

<template>
  <div class="flex flex-col items-start gap-1">
    <Tag
      v-if="part !== 'reason'"
      :value="state.label"
      :severity="state.severity"
      class="text-xs"
    />
    <span
      v-if="state.reason && part !== 'status'"
      class="text-text-muted text-xs"
    >{{ state.reason }}</span>
  </div>
</template>
