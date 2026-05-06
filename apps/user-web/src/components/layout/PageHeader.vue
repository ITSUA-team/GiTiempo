<script setup lang="ts">
const props = defineProps<{
  subtitle: string;
  title: string;
}>();
</script>

<template>
  <header class="flex flex-col gap-1.5">
    <h1 class="text-text-dark text-2xl font-semibold">
      {{ props.title }}
    </h1>
    <p class="text-text-muted text-sm">
      {{ props.subtitle }}
    </p>
  </header>
</template>
