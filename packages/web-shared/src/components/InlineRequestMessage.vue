<script setup lang="ts">
defineProps<{
  message: string | null;
  title: string;
}>();
</script>

<template>
  <div
    class="border-destructive/20 bg-destructive/5 rounded-lg border p-3"
    role="alert"
  >
    <p class="text-destructive text-sm font-medium">
      {{ title }}
    </p>
    <p
      v-if="message"
      class="text-destructive mt-1 text-xs"
    >
      {{ message }}
    </p>
  </div>
</template>
