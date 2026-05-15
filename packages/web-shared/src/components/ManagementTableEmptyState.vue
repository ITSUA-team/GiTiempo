<script setup lang="ts">
import EmptyStateBlock from './EmptyStateBlock.vue';

defineProps<{
  description: string;
  title: string;
}>();
</script>

<template>
  <EmptyStateBlock
    :title="title"
    :description="description"
  />
</template>
