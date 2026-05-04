<script setup lang="ts">
  import Button from 'primevue/button';

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
    <Button
      v-if="backLabel"
      variant="text"
      severity="primary"
      :label="`← ${backLabel}`"
      class="mb-2 w-fit"
      pt:label:class="font-bold text-[#5d2b85] text-[13px]"
      @click="emit('back')"
    />

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
