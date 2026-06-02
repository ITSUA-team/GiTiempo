<script setup lang="ts">
import Button from "primevue/button";

const props = defineProps<{
  copy: string;
  eyebrow: string;
  iconGlyph: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  title: string;
}>();

const emit = defineEmits<{
  primaryAction: [];
  secondaryAction: [];
}>();
</script>

<template>
  <section class="bg-app-bg flex min-h-screen items-center justify-center p-6">
    <div
      class="border-divider bg-surface-primary shadow-card flex w-full max-w-[520px] flex-col items-center gap-4 rounded-lg border p-8 text-center"
    >
      <div
        class="bg-accent-tint text-brand flex size-16 items-center justify-center rounded-full text-[28px] font-semibold"
        aria-hidden="true"
      >
        {{ props.iconGlyph }}
      </div>

      <p class="text-brand text-[13px] font-semibold">
        {{ props.eyebrow }}
      </p>

      <h1 class="text-text-dark text-[28px] font-semibold">
        {{ props.title }}
      </h1>

      <p class="text-text-muted max-w-[360px] text-sm leading-6">
        {{ props.copy }}
      </p>

      <div class="flex flex-wrap justify-center gap-2.5 pt-2">
        <Button
          :label="props.primaryActionLabel"
          @click="emit('primaryAction')"
        />
        <Button
          v-if="props.secondaryActionLabel"
          severity="secondary"
          outlined
          :label="props.secondaryActionLabel"
          @click="emit('secondaryAction')"
        />
      </div>
    </div>
  </section>
</template>
