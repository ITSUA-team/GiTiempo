<script setup lang="ts">
import Tag from 'primevue/tag';

defineProps<{
    visibility: 'public' | 'private';
}>();
</script>

<template>
  <Tag
    :value="visibility === 'public' ? 'Public' : 'Private'"
    :pt="{
      root: visibility === 'public'
        ? 'bg-accent-tint text-brand rounded-sm px-2 py-1 text-xs font-semibold'
        : 'bg-status-warn-bg text-status-warn-text rounded-sm px-2 py-1 text-xs font-semibold',
    }"
  />
</template>
