<script setup lang="ts">
import Avatar from "primevue/avatar";

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
</script>

<template>
  <header
    class="border-divider bg-surface sticky top-0 z-20 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-b px-4 sm:px-6"
  >
    <div class="flex items-center gap-3">
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

    <div class="min-w-0 px-2">
      <div class="flex justify-center">
        <slot name="center" />
      </div>
    </div>

    <div class="flex items-center gap-3">
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
