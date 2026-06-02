<script setup lang="ts">
import type { Component } from "vue";
import { RouterLink, type RouteLocationRaw } from "vue-router";

type WorkspaceNavigationItem = {
  icon: Component;
  label: string;
  name: string;
  to?: RouteLocationRaw;
};

const props = defineProps<{
  activeName?: string | null;
  items: WorkspaceNavigationItem[];
}>();

function isActive(name: string): boolean {
  return props.activeName === name;
}

function clearLinkFocus(event: MouseEvent): void {
  if (!(event.currentTarget instanceof HTMLElement)) return;

  event.currentTarget.blur();
}
</script>

<template>
  <aside
    class="border-divider bg-surface-primary hidden w-fit border-r sm:flex sm:flex-col"
  >
    <nav class="flex flex-1 flex-col gap-1 py-4">
      <RouterLink
        v-for="item in props.items"
        :key="item.name"
        v-tooltip.right="item.label"
        :to="item.to ?? { name: item.name }"
        :aria-current="isActive(item.name) ? 'page' : undefined"
        :aria-label="item.label"
        :class="[
          'flex h-11 items-center justify-center px-4 text-sm font-medium transition-colors sm:mx-2 sm:rounded-md',
          isActive(item.name)
            ? 'border-brand bg-accent-tint text-brand border-l-[3px] font-semibold'
            : 'text-text-muted hover:bg-app-bg',
        ]"
        @click="clearLinkFocus"
      >
        <component
          :is="item.icon"
          aria-hidden="true"
          class="size-5 shrink-0"
        />
        <span class="sr-only">{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>

  <nav
    class="border-divider bg-surface-primary fixed inset-x-0 bottom-0 z-20 flex h-16 border-t sm:hidden"
  >
    <RouterLink
      v-for="item in props.items"
      :key="`mobile-${item.name}`"
      :to="item.to ?? { name: item.name }"
      :aria-current="isActive(item.name) ? 'page' : undefined"
      :aria-label="item.label"
      :class="[
        'flex flex-1 items-center justify-center border-t-2 px-2 transition-colors',
        isActive(item.name)
          ? 'border-brand bg-accent-tint text-brand'
          : 'text-text-muted hover:bg-app-bg border-transparent',
      ]"
      @click="clearLinkFocus"
    >
      <component
        :is="item.icon"
        aria-hidden="true"
        class="size-5 shrink-0"
      />
      <span class="sr-only">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
