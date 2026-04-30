<script setup lang="ts">
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
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
            <Avatar
              :label="authStore.userInitials"
              shape="circle"
              class="size-10"
              :pt="{
                root: 'bg-accent-tint text-[12px] font-semibold text-brand',
              }"
            />
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
            <div class="flex flex-col gap-1">
              <label
                for="profile-display-name"
                class="text-[13px] font-medium text-text-dark"
              >
                Display name
              </label>
              <InputText
                input-id="profile-display-name"
                :model-value="authStore.displayName"
                disabled
                class="h-[42px] w-full"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label
                for="profile-email"
                class="text-[13px] font-medium text-text-dark"
              >
                Email
              </label>
              <InputText
                input-id="profile-email"
                :model-value="authStore.profile?.email ?? 'alexey@example.com'"
                disabled
                class="h-[42px] w-full"
                :pt="{
                  root: 'bg-app-bg text-text-muted',
                }"
              />
            </div>

            <div class="flex justify-end gap-2">
              <Button
                type="button"
                label="Cancel"
                severity="secondary"
                variant="outlined"
                size="small"
                disabled
              />
              <Button
                type="button"
                label="Save changes"
                size="small"
                disabled
              />
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
            <Tag
              value="Connected"
              severity="success"
              :pt="{
                root: 'rounded-sm bg-status-active-bg px-2 py-1 text-[10px] font-semibold text-status-active-text',
                label: 'leading-none',
              }"
            />
            <div class="flex gap-2">
              <Button
                type="button"
                label="Reconnect"
                severity="secondary"
                variant="outlined"
                size="small"
                disabled
              />
              <Button
                type="button"
                label="Disconnect"
                severity="danger"
                variant="outlined"
                size="small"
                disabled
              />
            </div>
          </div>
        </div>
      </section>

      <div class="flex justify-end pt-4">
        <Button
          type="button"
          label="Sign out"
          severity="danger"
          variant="outlined"
          @click="handleSignOut"
        />
      </div>
    </div>
  </section>
</template>
