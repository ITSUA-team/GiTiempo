<script setup lang="ts">
import { Cog6ToothIcon } from "@heroicons/vue/24/outline";
import Avatar from "primevue/avatar";
import { RouterLink, type RouteLocationRaw } from "vue-router";

const props = withDefaults(
  defineProps<{
    counterpartHref: string;
    counterpartLabel: string;
    displayName: string;
    productName?: string;
    settingsLabel?: string;
    settingsTo?: RouteLocationRaw;
    userInitials: string;
    workspaceName: string;
    workspaceShortName?: string;
  }>(),
  {
    productName: "GiTiempo",
    settingsLabel: "Settings",
    settingsTo: undefined,
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
      <RouterLink
        v-if="props.settingsTo"
        :to="props.settingsTo"
        :aria-label="props.settingsLabel"
        class="hidden rounded-md p-2 text-text-muted transition hover:bg-app-bg hover:text-brand sm:flex"
      >
        <Cog6ToothIcon
          class="size-5"
          aria-hidden="true"
        />
      </RouterLink>
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
