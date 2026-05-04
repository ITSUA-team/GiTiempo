<script setup lang="ts">
  withDefaults(
    defineProps<{
      title: string;
      subtitle?: string;
      backLabel?: string;
    }>(),
    {
      subtitle: undefined,
      backLabel: undefined,
    },
  );

  const emit = defineEmits<{
    back: [];
  }>();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <!-- Optional back link -->
    <button
      v-if="backLabel"
      class="text-brand mb-2 w-fit text-[13px] font-semibold hover:opacity-75"
      @click="emit('back')"
    >
      ← {{ backLabel }}
    </button>

    <!-- Title row: h1 + subtitle left, optional action slot right -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1.5">
        <h1 class="text-text-dark text-[28px] font-semibold leading-none">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-text-muted text-sm">
          {{ subtitle }}
        </p>
      </div>

      <!-- Optional action button(s) -->
      <slot />
    </div>
  </div>
</template>
