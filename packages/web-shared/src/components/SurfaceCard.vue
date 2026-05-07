<script setup lang="ts">
withDefaults(
  defineProps<{
    bodyClass?: string;
    border?: boolean;
    paddingClass?: string;
  }>(),
  {
    bodyClass: "",
    border: false,
    paddingClass: "p-5",
  },
);
</script>

<template>
  <section
    class="bg-surface shadow-card rounded-lg"
    :class="[paddingClass, border ? 'border-divider border' : '']"
  >
    <div :class="bodyClass">
      <slot />
    </div>
  </section>
</template>
