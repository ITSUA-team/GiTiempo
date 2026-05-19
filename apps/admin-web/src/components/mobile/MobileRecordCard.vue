<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: string;
  }>(),
  {
    as: 'article',
  },
);
</script>

<template>
  <component
    :is="as"
    class="border-divider bg-surface flex flex-col gap-3 rounded-lg border p-4"
  >
    <slot />

    <div
      v-if="$slots.actions"
      class="border-divider flex justify-end gap-2 border-t pt-3"
    >
      <slot name="actions" />
    </div>
  </component>
</template>
