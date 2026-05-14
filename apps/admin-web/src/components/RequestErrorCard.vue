<script setup lang="ts">
import { SurfaceCard } from '@gitiempo/web-shared';
import Button from 'primevue/button';

withDefaults(
  defineProps<{
    message: string;
    retryLabel?: string;
    title: string;
  }>(),
  { retryLabel: 'Try again' },
);

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <SurfaceCard padding-class="p-6">
    <div class="flex flex-col items-center gap-3 py-6 text-center">
      <span class="text-text-dark text-[15px] font-semibold">{{ title }}</span>
      <span class="text-text-muted text-[13px]">{{ message }}</span>
      <Button
        :label="retryLabel"
        severity="secondary"
        outlined
        @click="emit('retry')"
      />
    </div>
  </SurfaceCard>
</template>
