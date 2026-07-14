<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    hasDestructiveActions?: boolean;
  }>(),
  {
    hasDestructiveActions: false,
  },
);
</script>

<template>
  <div
    class="flex w-full items-center gap-2"
    :class="props.hasDestructiveActions ? 'justify-between' : 'justify-end'"
  >
    <div
      v-if="props.hasDestructiveActions"
      data-footer-actions="destructive"
      class="flex justify-start gap-2"
    >
      <slot name="destructive" />
    </div>
    <div
      data-footer-actions="primary"
      class="flex justify-end gap-2"
    >
      <slot />
    </div>
  </div>
</template>
