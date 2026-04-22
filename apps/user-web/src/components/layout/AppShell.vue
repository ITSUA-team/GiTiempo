<script setup lang="ts">
import {
  ArrowRightStartOnRectangleIcon,
  ChartBarSquareIcon,
  ClockIcon,
  HomeIcon,
  ListBulletIcon,
  UserCircleIcon,
} from "@heroicons/vue/24/outline";
import { computed } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";

import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const navItems = computed(() => [
  {
    icon: HomeIcon,
    label: "Dashboard",
    name: routeNames.dashboard,
  },
  {
    icon: ClockIcon,
    label: "Timer",
    name: routeNames.timer,
  },
  {
    icon: ListBulletIcon,
    label: "Time Entries",
    name: routeNames.timeEntries,
  },
  {
    icon: ChartBarSquareIcon,
    label: "Profile",
    name: routeNames.profile,
  },
]);

async function handleSignOut(): Promise<void> {
  await authStore.logout();
  await router.replace({ name: routeNames.login });
}

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
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-tint text-sm font-semibold text-brand"
        >
          GT
        </div>
        <div class="flex flex-col gap-0.5">
          <p class="text-sm font-semibold">
            GiTiempo
          </p>
          <p class="text-xs text-text-muted">
            Member workspace
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="hidden text-right sm:block">
          <p class="text-sm font-medium">
            Signed in
          </p>
          <p class="text-xs text-text-muted">
            User web
          </p>
        </div>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full border border-divider bg-app-bg text-text-muted"
          aria-label="Account settings"
        >
          <UserCircleIcon class="h-6 w-6" />
        </button>
      </div>
    </header>

    <div class="flex min-h-[calc(100vh-4rem)]">
      <aside
        class="hidden border-r border-divider bg-surface sm:flex sm:w-16 sm:flex-col lg:w-60"
      >
        <nav class="flex flex-1 flex-col gap-1 p-2">
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

        <div class="border-t border-divider p-2">
          <button
            type="button"
            class="flex h-11 w-full items-center gap-3 rounded-r-md px-4 text-sm font-medium text-text-dark transition-colors hover:bg-app-bg"
            @click="handleSignOut"
          >
            <ArrowRightStartOnRectangleIcon
              class="h-5 w-5 shrink-0 text-text-muted"
            />
            <span class="hidden lg:inline">Sign out</span>
          </button>
        </div>
      </aside>

      <main class="flex-1 p-4 sm:p-6">
        <RouterView />
      </main>
    </div>

    <nav
      class="fixed inset-x-0 bottom-0 z-20 flex h-16 border-t border-divider bg-surface sm:hidden"
    >
      <RouterLink
        v-for="item in navItems"
        :key="`mobile-${item.name}`"
        :to="{ name: item.name }"
        class="flex flex-1 flex-col items-center justify-center gap-1 text-xs"
        :class="isActive(item.name) ? 'text-brand' : 'text-text-muted'"
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
