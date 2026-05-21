<script setup lang="ts">
import Avatar from "primevue/avatar";
import { computed, useSlots } from "vue";

const props = withDefaults(
  defineProps<{
    counterpartHref: string;
    counterpartLabel: string;
    displayName: string;
    productName?: string;
    userInitials: string;
    workspaceName: string;
    workspaceShortName?: string;
  }>(),
  {
    productName: "GiTiempo",
    workspaceShortName: "GT",
  },
);

const slots = useSlots();
const hasCenterSlot = computed(() => Boolean(slots.center));
</script>

<template>
  <header
    class="border-divider bg-surface sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[4rem_auto] items-center gap-x-4 border-b px-4 sm:h-16 sm:grid-rows-1 sm:px-6"
  >
    <div class="row-start-1 flex items-center gap-3">
      <div
        class="bg-accent-tint text-brand flex size-8 items-center justify-center rounded-lg text-xs font-semibold"
      >
        {{ props.workspaceShortName }}
      </div>
      <div class="flex flex-col gap-0.5">
        <p class="text-base font-semibold">
          {{ props.productName }}
        </p>
        <p class="text-text-muted text-xs">
          {{ props.workspaceName }}
        </p>
      </div>
    </div>

    <div
      v-if="hasCenterSlot"
      class="col-span-3 row-start-2 -mx-4 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mx-0 sm:px-2"
      data-testid="workspace-header-center-row"
    >
      <div class="flex justify-center">
        <slot name="center" />
      </div>
    </div>

    <div class="col-start-3 row-start-1 flex items-center gap-3">
      <a
        :href="props.counterpartHref"
        class="text-brand hidden text-[13px] font-semibold transition hover:underline sm:block"
      >
        {{ props.counterpartLabel }}
      </a>
      <div class="hidden text-right sm:block">
        <p class="text-text-dark text-[13px] font-medium">
          {{ props.displayName }}
        </p>
      </div>
      <Avatar
        :label="props.userInitials"
        shape="circle"
        class="size-8"
        aria-label="Account profile"
        :pt="{
          root: 'bg-accent-tint text-xs font-semibold text-brand',
        }"
      />
    </div>
  </header>
</template>
