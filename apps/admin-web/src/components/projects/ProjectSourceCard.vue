<script setup lang="ts">
  export type ProjectSource = 'manual' | 'import';

  const model = defineModel<ProjectSource>({ default: 'manual' });

  const options: {
    value: ProjectSource;
    label: string;
    description: string;
  }[] = [
    {
      value: 'manual',
      label: 'Manual project',
      description:
        'Use this when a project is internal, still being prepared, or not available through a workspace import yet.',
    },
    {
      value: 'import',
      label: 'Workspace import',
      description:
        'Use imports when the project already exists in a connected workspace and should keep its external context.',
    },
  ];
</script>

<template>
  <div
    class="bg-surface shadow-card flex w-[320px] shrink-0 flex-col gap-[14px] rounded-[10px] p-5"
  >
    <!-- Title -->
    <h3 class="text-text-dark text-[18px] font-semibold">Project Source</h3>

    <!-- Copy -->
    <p class="text-text-muted text-[13px] leading-snug">
      Projects can come from connected workspaces or be added manually. This
      screen covers the manual path.
    </p>

    <!-- Options -->
    <div
      v-for="option in options"
      :key="option.value"
      class="flex cursor-pointer flex-col gap-2 rounded-[10px] p-[14px] transition-colors"
      :class="
        model === option.value
          ? 'border-brand bg-accent-tint border'
          : 'bg-app-bg hover:bg-accent-tint/40'
      "
      @click="model = option.value"
    >
      <span class="text-text-dark text-[14px] font-semibold">
        {{ option.label }}
      </span>
      <p class="text-text-muted text-[13px] leading-snug">
        {{ option.description }}
      </p>
    </div>

    <!-- Footer note -->
    <p class="text-text-muted text-[12px] leading-snug">
      You can still assign the PM, set visibility, and adjust project details
      after creation.
    </p>
  </div>
</template>
