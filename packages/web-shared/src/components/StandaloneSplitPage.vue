<script setup lang="ts">
const panelRootClass = "w-full lg:flex lg:flex-1 lg:min-w-[50vw]";
const panelInnerClass = "flex h-full w-full max-w-[600px] flex-col justify-center";

withDefaults(
  defineProps<{
    leftPanelClass?: string;
  }>(),
  {
    leftPanelClass: "bg-surface-primary",
  },
);
</script>

<template>
  <div class="bg-app-bg text-text-dark min-h-screen">
    <div class="mx-auto flex min-h-screen flex-col lg:flex-row">
      <div
        :class="[
          panelRootClass,
          leftPanelClass,
          'lg:justify-end'
        ]"
      >
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
