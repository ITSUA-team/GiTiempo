<script setup lang="ts">
import { LockClosedIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline';
import type { TimeEntryResponse } from '@gitiempo/shared';
import Button from 'primevue/button';

defineProps<{ entry: TimeEntryResponse; disabled: boolean }>();
const emit = defineEmits<{ edit: []; remove: [] }>();
</script>

<template>
  <LockClosedIcon
    v-if="!entry.endedAt || entry.invoiceId"
    class="text-text-muted mx-1.5 size-5"
    aria-hidden="true"
  />
  <template v-else>
    <Button
      v-tooltip.bottom="'Edit'"
      text
      rounded
      size="small"
      :pt="{ root: 'size-8 p-0' }"
      :disabled="disabled"
      :aria-label="`Edit time entry for ${entry.task.title}`"
      @click="emit('edit')"
    >
      <template #icon>
        <PencilIcon
          class="size-5"
          aria-hidden="true"
        />
      </template>
    </Button>
    <Button
      v-tooltip.bottom="'Delete'"
      text
      rounded
      severity="danger"
      size="small"
      :pt="{ root: 'size-8 p-0' }"
      :disabled="disabled"
      :aria-label="`Delete time entry for ${entry.task.title}`"
      @click="emit('remove')"
    >
      <template #icon>
        <TrashIcon
          class="size-5"
          aria-hidden="true"
        />
      </template>
    </Button>
  </template>
</template>
