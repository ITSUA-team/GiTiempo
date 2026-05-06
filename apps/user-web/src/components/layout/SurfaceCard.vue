<script setup lang="ts">
withDefaults(
  defineProps<{
    bodyClass?: string;
    paddingClass?: string;
  }>(),
  {
    bodyClass: "",
    paddingClass: "p-5",
  },
);
</script>

<template>
  <section
    class="border-divider bg-surface shadow-card rounded-lg border"
    :class="paddingClass"
  >
    <div :class="bodyClass">
      <slot />
    </div>
  </section>
</template>
