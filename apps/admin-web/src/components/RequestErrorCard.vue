<script setup lang="ts">
import { SurfaceCard } from '@gitiempo/web-shared';
import RequestErrorBlock from './RequestErrorBlock.vue';

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
    <RequestErrorBlock
      :message="message"
      :retry-label="retryLabel"
      :title="title"
      @retry="emit('retry')"
    />
  </SurfaceCard>
</template>
