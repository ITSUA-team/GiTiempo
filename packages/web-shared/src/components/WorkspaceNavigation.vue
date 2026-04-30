<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from "vue-router";

type WorkspaceNavigationItem = {
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
</script>

<template>
  <aside
    class="border-divider bg-surface hidden border-r sm:flex sm:w-52 sm:flex-col lg:w-60"
  >
    <nav class="flex flex-1 flex-col gap-1 py-4">
      <RouterLink
        v-for="item in props.items"
        :key="item.name"
        :to="item.to ?? { name: item.name }"
        :class="[
          'flex h-11 items-center rounded-r-md px-4 text-sm font-medium transition-colors',
          isActive(item.name)
            ? 'border-brand bg-accent-tint text-brand border-l-[3px] font-semibold'
            : 'text-text-dark hover:bg-app-bg',
        ]"
      >
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>

  <nav
    class="border-divider bg-surface fixed inset-x-0 bottom-0 z-20 flex h-16 border-t sm:hidden"
  >
    <RouterLink
      v-for="item in props.items"
      :key="`mobile-${item.name}`"
      :to="item.to ?? { name: item.name }"
      :class="isActive(item.name) ? 'text-brand' : 'text-text-muted'"
      class="flex flex-1 items-center justify-center px-2 text-center text-xs font-medium"
    >
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
