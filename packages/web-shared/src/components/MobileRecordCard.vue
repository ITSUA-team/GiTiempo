<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: string;
    tone?: 'default' | 'highlighted';
  }>(),
  {
    as: 'article',
    tone: 'default',
  },
);
</script>

<template>
  <component
    :is="as"
    class="border-divider flex flex-col gap-3 rounded-lg border p-4"
    :class="tone === 'highlighted' ? 'bg-accent-tint' : 'bg-surface-primary'"
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
