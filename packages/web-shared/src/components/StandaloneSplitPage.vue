<script setup lang="ts">
const panelRootClass = "w-full lg:flex lg:flex-1 lg:min-w-[50vw]";
const panelInnerClass = "flex h-full w-full max-w-[600px] flex-col justify-center";

const props = withDefaults(
  defineProps<{
    leftPanelClass?: string;
    leftPanelFullBleed?: boolean;
  }>(),
  {
    leftPanelClass: "bg-surface-primary",
    leftPanelFullBleed: false,
  },
);
</script>

<template>
  <div
    v-if="props.leftPanelFullBleed"
    class="bg-app-bg text-text-dark relative min-h-screen"
    data-testid="auth-split-page"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 hidden lg:flex"
      data-testid="auth-split-background"
    >
      <div
        :class="['w-1/2', props.leftPanelClass]"
        data-testid="auth-split-background-brand"
      />
      <div class="w-1/2" />
    </div>

    <div
      class="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col lg:flex-row lg:items-stretch lg:justify-between"
      data-testid="auth-split-content"
    >
      <div
        class="relative flex w-full flex-col lg:w-1/2 lg:max-w-[640px] lg:flex-none"
        data-testid="auth-split-intro"
      >
        <div
          aria-hidden="true"
          :class="['absolute inset-0 lg:hidden', props.leftPanelClass]"
        />
        <div class="relative flex flex-1 flex-col">
          <slot name="left" />
        </div>
      </div>

      <div
        class="flex w-full flex-col justify-center lg:w-1/2 lg:max-w-[640px] lg:flex-none"
        data-testid="auth-split-form"
      >
        <slot name="right" />
      </div>
    </div>
  </div>

  <div
    v-else
    class="bg-app-bg text-text-dark min-h-screen"
  >
    <div class="mx-auto flex min-h-screen flex-col lg:flex-row">
      <div :class="[panelRootClass, props.leftPanelClass, 'lg:justify-end']">
        <div :class="panelInnerClass">
          <slot name="left" />
        </div>
      </div>
      <div :class="[panelRootClass, 'lg:justify-start']">
        <div :class="panelInnerClass">
          <slot name="right" />
        </div>
      </div>
    </div>
  </div>
</template>
