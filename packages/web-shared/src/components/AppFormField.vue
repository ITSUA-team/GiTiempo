<script setup lang="ts">
  const props = defineProps<{
    label: string;
    size?: 'sm' | 'md';
  }>();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span
      class="text-text-dark font-medium"
      :class="props.size === 'sm' ? 'text-[12px]' : 'text-[13px]'"
    >
      {{ props.label }}
    </span>
    <slot />
  </div>
</template>
