<script setup lang="ts">
withDefaults(
  defineProps<{
    bodyClass?: string;
    paddingClass?: string;
  }>(),
  {
    bodyClass: "",
    paddingClass: "p-6",
  },
);
</script>

<template>
  <section
    class="border-divider bg-surface-primary shadow-card rounded-lg border"
    :class="paddingClass"
  >
    <div :class="bodyClass">
      <slot />
    </div>
  </section>
</template>
