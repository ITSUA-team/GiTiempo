<script setup lang="ts">
withDefaults(
  defineProps<{
    description?: string;
    title: string;
    variant?: "page" | "section";
  }>(),
  {
    description: undefined,
    variant: "section",
  },
);
</script>

<template>
  <header
    v-if="variant === 'page'"
    class="flex flex-col gap-1.5"
  >
    <h1 class="text-text-dark text-2xl font-semibold">
      {{ title }}
    </h1>
    <p
      v-if="description"
      class="text-text-muted text-sm"
    >
      {{ description }}
    </p>
  </header>

  <div
    v-else-if="$slots.actions"
    class="flex items-start justify-between gap-4"
  >
    <div class="flex flex-col gap-1.5">
      <h2 class="text-text-dark text-lg font-semibold">
        {{ title }}
      </h2>
      <p
        v-if="description"
        class="text-text-muted text-[13px]"
      >
        {{ description }}
      </p>
    </div>

    <slot name="actions" />
  </div>

  <div
    v-else
    class="flex flex-col gap-1.5"
  >
    <h2 class="text-text-dark text-lg font-semibold">
      {{ title }}
    </h2>
    <p
      v-if="description"
      class="text-text-muted text-[13px]"
    >
      {{ description }}
    </p>
  </div>
</template>
