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
    class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-divider bg-surface px-4 sm:px-6"
  >
    <div class="flex items-center gap-3">
      <div
        class="flex size-8 items-center justify-center rounded-lg bg-accent-tint text-xs font-semibold text-brand"
      >
        {{ props.workspaceShortName }}
      </div>
      <div class="flex flex-col gap-0.5">
        <p class="text-base font-semibold">
          {{ props.productName }}
        </p>
        <p class="text-xs text-text-muted">
          {{ props.workspaceName }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <a
        :href="props.counterpartHref"
        class="hidden text-[13px] font-semibold text-brand transition hover:underline sm:block"
      >
        {{ props.counterpartLabel }}
      </a>
      <div class="hidden text-right sm:block">
        <p class="text-[13px] font-medium text-text-dark">
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
