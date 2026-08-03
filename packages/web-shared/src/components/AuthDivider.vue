<script setup lang="ts">
const props = defineProps<{
  label: string;
}>();
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="bg-divider h-px flex-1" />
    <span class="text-text-muted text-xs font-medium">
      {{ props.label }}
    </span>
    <span class="bg-divider h-px flex-1" />
  </div>
</template>
