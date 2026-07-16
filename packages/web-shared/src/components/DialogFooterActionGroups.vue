<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    hasDestructiveActions?: boolean;
    stackOnMobile?: boolean;
  }>(),
  {
    hasDestructiveActions: false,
    stackOnMobile: false,
  },
);
</script>

<template>
  <div
    class="w-full"
    :class="[
      props.stackOnMobile
        ? 'grid grid-cols-1 gap-2 sm:flex sm:items-center'
        : 'flex items-center',
      // gap-6 keeps the destructive group visibly apart from Cancel/Save even
      // when the row is shrink-wrapped and justify-between has no room to act.
      props.hasDestructiveActions
        ? props.stackOnMobile
          ? 'sm:justify-between sm:gap-6'
          : 'justify-between gap-6'
        : props.stackOnMobile
          ? 'sm:justify-end sm:gap-2'
          : 'justify-end gap-2',
    ]"
  >
    <div
      v-if="props.hasDestructiveActions"
      data-footer-actions="destructive"
      :class="
        props.stackOnMobile
          ? 'grid grid-cols-1 gap-2 sm:flex sm:justify-start'
          : 'flex justify-start gap-2'
      "
    >
      <slot name="destructive" />
    </div>
    <div
      data-footer-actions="primary"
      :class="
        props.stackOnMobile
          ? 'grid grid-cols-1 gap-2 sm:flex sm:justify-end'
          : 'flex justify-end gap-2'
      "
    >
      <slot />
    </div>
  </div>
</template>
