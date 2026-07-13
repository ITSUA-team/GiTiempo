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

function getIconShellClass(name: string): string {
  return [
    "flex size-8 items-center justify-center rounded-lg transition-colors",
    isActive(name)
      ? "bg-accent-tint text-brand"
      : "text-text-muted group-hover:bg-app-bg",
  ].join(" ");
}
</script>

<template>
  <aside
    class="border-divider bg-surface-primary hidden w-20 border-r sm:flex sm:flex-col"
  >
    <nav class="flex flex-1 flex-col items-center gap-1 py-4">
      <RouterLink
        v-for="item in props.items"
        :key="item.name"
        v-tooltip.right="item.label"
        :to="item.to ?? { name: item.name }"
        :aria-current="isActive(item.name) ? 'page' : undefined"
        :aria-label="item.label"
        :class="[
          'group focus-visible:outline-brand flex h-11 w-full items-center justify-center text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
          isActive(item.name) ? 'font-semibold' : undefined,
        ]"
        @click="clearLinkFocus"
      >
        <span
          :class="getIconShellClass(item.name)"
          data-testid="workspace-navigation-icon-shell"
        >
          <component
            :is="item.icon"
            aria-hidden="true"
            class="size-5 shrink-0"
          />
        </span>
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
        'group focus-visible:outline-brand flex flex-1 items-center justify-center px-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
        isActive(item.name) ? 'font-semibold' : undefined,
      ]"
      @click="clearLinkFocus"
    >
      <span
        :class="getIconShellClass(item.name)"
        data-testid="workspace-navigation-mobile-icon-shell"
      >
        <component
          :is="item.icon"
          aria-hidden="true"
          class="size-5 shrink-0"
        />
      </span>
      <span class="sr-only">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
