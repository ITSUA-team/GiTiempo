<script setup lang="ts">
import { useRouter } from "vue-router";

import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();

async function handleSignOut(): Promise<void> {
  await authStore.logout();
  await router.replace({ name: routeNames.login });
}
</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <header class="flex flex-col gap-[6px]">
      <h1 class="text-2xl font-semibold text-text-dark">
        Profile
      </h1>
      <p class="text-sm text-text-muted">
        Manage your personal settings and session access.
      </p>
    </header>

    <div class="flex max-w-[620px] flex-col gap-6">
      <section
        class="rounded-[10px] border border-divider bg-surface p-5 shadow-card"
      >
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-4">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-tint text-[12px] font-semibold text-brand"
            >
              {{ authStore.userInitials }}
            </div>
            <div class="flex flex-col gap-0.5">
              <p class="text-sm font-semibold text-text-dark">
                {{ authStore.displayName }}
              </p>
              <p class="text-xs text-text-muted">
                Workspace member
              </p>
            </div>
          </div>

          <div class="grid gap-4">
            <label class="flex flex-col gap-[6px]">
              <span class="text-[13px] font-medium text-text-dark">
                Display name
              </span>
              <input
                :value="authStore.displayName"
                type="text"
                disabled
                class="h-[42px] rounded-[6px] border border-divider bg-surface px-3 text-sm text-text-dark outline-none disabled:cursor-default"
              >
            </label>

            <label class="flex flex-col gap-[6px]">
              <span class="text-[13px] font-medium text-text-dark">Email</span>
              <input
                :value="authStore.profile?.email ?? 'alexey@example.com'"
                type="email"
                disabled
                class="h-[42px] rounded-[6px] border border-divider bg-app-bg px-3 text-sm text-text-muted outline-none disabled:cursor-default"
              >
            </label>

            <div class="flex justify-end gap-2">
              <button
                type="button"
                disabled
                class="rounded-[6px] border border-divider bg-surface px-4 py-[10px] text-[11px] font-semibold text-text-dark"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled
                class="rounded-[6px] bg-brand px-4 py-[10px] text-[11px] font-semibold text-white"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        class="rounded-[10px] border border-divider bg-surface p-5 shadow-card"
      >
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-base font-semibold text-text-dark">
              GitHub Connection
            </h2>
            <p class="text-xs text-text-muted">
              Connect your account to start timers from organizations,
              repositories, and issues.
            </p>
          </div>

          <div
            class="grid gap-3 text-xs text-text-muted sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
          >
            <div class="grid gap-2">
              <p>Connected account</p>
              <p>Scopes</p>
            </div>
            <div class="grid gap-2 text-right text-text-dark">
              <p>alexeytsukanov</p>
              <p>Organizations, repositories, issues</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <span
              class="rounded bg-[#E8F5E9] px-2 py-1 text-[10px] font-semibold text-[#2E7D32]"
            >
              Connected
            </span>
            <div class="flex gap-2">
              <button
                type="button"
                disabled
                class="rounded-[6px] border border-divider bg-surface px-4 py-[10px] text-[11px] font-semibold text-text-dark"
              >
                Reconnect
              </button>
              <button
                type="button"
                disabled
                class="rounded-[6px] border border-destructive bg-surface px-4 py-[10px] text-[11px] font-semibold text-destructive"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </section>

      <div class="flex justify-end pt-4">
        <button
          type="button"
          class="rounded-[6px] border border-destructive bg-surface px-4 py-[10px] text-sm font-semibold text-destructive transition hover:bg-destructive/5"
          @click="handleSignOut"
        >
          Sign out
        </button>
      </div>
    </div>
  </section>
</template>
