<script setup lang="ts">
withDefaults(
  defineProps<{
    description?: string;
    title: string;
    variant?: "page" | "section" | "stats";
  }>(),
  {
    description: undefined,
    variant: "section",
  },
);
</script>

<template>
  <div
    v-if="variant === 'stats'"
    class="flex flex-col gap-6"
  >
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1.5">
        <h1 class="text-text-dark text-[28px] font-semibold">
          {{ title }}
        </h1>
        <p
          v-if="description"
          class="text-text-muted text-sm font-normal"
        >
          {{ description }}
        </p>
      </div>
      <div>
        <slot name="actions" />
      </div>
    </div>
    <div
      v-if="$slots.stats"
      class="flex h-24 gap-4"
    >
      <slot name="stats" />
    </div>
  </div>

  <header
    v-else-if="variant === 'page'"
    :class="
      $slots.actions
        ? 'flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'
        : 'flex flex-col gap-1.5'
    "
  >
    <div
      :class="$slots.actions ? 'flex flex-col gap-1.5' : undefined"
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
    </div>

    <slot name="actions" />
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
