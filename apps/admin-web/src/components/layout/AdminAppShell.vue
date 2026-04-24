<script setup lang="ts">
import {
  Cog6ToothIcon,
  CreditCardIcon,
  DocumentChartBarIcon,
  FolderIcon,
  HomeIcon,
  UserCircleIcon,
  UsersIcon,
} from "@heroicons/vue/24/outline";
import { computed } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";

import { getUserWorkspaceHref } from "@/lib/workspace-link";
import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const authStore = useAuthStore();
const userWorkspaceHref = getUserWorkspaceHref();

const navItems = computed(() => [
  { icon: HomeIcon, label: "Dashboard", name: routeNames.dashboard },
  { icon: DocumentChartBarIcon, label: "Reports", name: routeNames.reports },
  { icon: CreditCardIcon, label: "Invoices", name: routeNames.invoices },
  { icon: UsersIcon, label: "Members", name: routeNames.members },
  { icon: FolderIcon, label: "Projects", name: routeNames.projects },
  { icon: Cog6ToothIcon, label: "Settings", name: routeNames.settings },
]);

function isActive(name: string): boolean {
  return route.name === name;
}
</script>

<template>
  <div class="min-h-screen bg-app-bg text-text-dark">
    <header
      class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-divider bg-surface px-4 sm:px-6"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent-tint text-[12px] font-semibold text-brand"
        >
          GT
        </div>
        <div class="flex flex-col gap-[2px]">
          <p class="text-[16px] font-semibold">
            GiTiempo
          </p>
          <p class="text-xs text-text-muted">
            {{ authStore.workspaceName }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <a
          :href="userWorkspaceHref"
          class="hidden text-[13px] font-semibold text-brand transition hover:underline sm:block"
        >
          User workspace
        </a>
        <div class="hidden text-right sm:block">
          <p class="text-[13px] font-medium text-text-dark">
            {{ authStore.displayName }}
          </p>
        </div>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full bg-accent-tint text-[12px] font-semibold text-brand"
          aria-label="Account profile"
        >
          <span class="sm:hidden">{{ authStore.userInitials }}</span>
          <UserCircleIcon class="hidden h-5 w-5 sm:block" />
        </button>
      </div>
    </header>

    <div class="flex min-h-[calc(100vh-4rem)]">
      <aside
        class="hidden border-r border-divider bg-surface sm:flex sm:w-16 sm:flex-col lg:w-60"
      >
        <nav class="flex flex-1 flex-col gap-1 py-4">
          <RouterLink
            v-for="item in navItems"
            :key="item.name"
            :to="{ name: item.name }"
            :class="[
              'flex h-11 items-center gap-3 rounded-r-md px-4 text-sm font-medium transition-colors',
              isActive(item.name)
                ? 'border-l-[3px] border-brand bg-accent-tint text-brand font-semibold'
                : 'text-text-dark hover:bg-app-bg',
            ]"
          >
            <component
              :is="item.icon"
              :class="[
                'h-5 w-5 shrink-0',
                isActive(item.name) ? 'text-brand' : 'text-text-muted',
              ]"
            />
            <span class="hidden lg:inline">{{ item.label }}</span>
          </RouterLink>
        </nav>
      </aside>

      <main class="flex-1 p-4 sm:p-6">
        <RouterView />
      </main>
    </div>

    <nav
      class="fixed inset-x-0 bottom-0 z-20 flex h-16 border-t border-divider bg-surface sm:hidden"
    >
      <RouterLink
        v-for="item in navItems.slice(0, 5)"
        :key="`mobile-${item.name}`"
        :to="{ name: item.name }"
        :class="isActive(item.name) ? 'text-brand' : 'text-text-muted'"
        class="flex flex-1 flex-col items-center justify-center gap-1 text-xs"
      >
        <component
          :is="item.icon"
          class="h-5 w-5"
        />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
