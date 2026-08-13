<script setup lang="ts">
const panelRootClass = "w-full lg:flex lg:flex-1 lg:min-w-[50vw]";
const panelInnerClass = "flex h-full w-full max-w-[600px] flex-col justify-center";
const growingPanelRootClass = "w-full lg:flex lg:flex-1 lg:justify-start";
const fullBleedIntroInnerClass =
  "mx-auto flex h-full w-full max-w-[640px] flex-col justify-center";
// The design fixes the form column at 520 on a 1280 canvas — about 41%. Keeping
// that ratio instead of the raw pixel value stops the form reading as a narrow
// strip on large displays, while the bounds keep it usable at both extremes.
const fixedPanelRootClass =
  "w-full lg:flex lg:w-[41%] lg:max-w-[640px] lg:min-w-[520px] lg:flex-none";
const uncappedInnerClass = "flex h-full w-full flex-col justify-center";

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
  <div class="bg-app-bg text-text-dark min-h-screen">
    <div class="mx-auto flex min-h-screen flex-col lg:flex-row">
      <div
        :class="[
          props.leftPanelFullBleed ? growingPanelRootClass : panelRootClass,
          props.leftPanelClass,
          props.leftPanelFullBleed ? '' : 'lg:justify-end',
        ]"
      >
        <div
          :class="
            props.leftPanelFullBleed ? fullBleedIntroInnerClass : panelInnerClass
          "
        >
          <slot name="left" />
        </div>
      </div>
      <div
        :class="[
          props.leftPanelFullBleed ? fixedPanelRootClass : panelRootClass,
          'lg:justify-start',
        ]"
      >
        <div :class="props.leftPanelFullBleed ? uncappedInnerClass : panelInnerClass">
          <slot name="right" />
        </div>
      </div>
    </div>
  </div>
</template>
