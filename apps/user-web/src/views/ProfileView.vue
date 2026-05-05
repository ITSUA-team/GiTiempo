<script setup lang="ts">
  import { ProjectPageHeader } from '@gitiempo/web-shared';
  import Avatar from 'primevue/avatar';
  import Button from 'primevue/button';
  import InputText from 'primevue/inputtext';
  import Tag from 'primevue/tag';
  import { useRouter } from 'vue-router';

  import { routeNames } from '@/router';
  import { useAuthStore } from '@/stores/auth';

  const authStore = useAuthStore();
  const router = useRouter();

  async function handleSignOut(): Promise<void> {
    await authStore.logout();
    await router.replace({ name: routeNames.login });
  }
</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <ProjectPageHeader
      title="Profile"
      subtitle="Manage your personal settings and session access."
      title-size="lg"
    />

    <div class="flex max-w-[620px] flex-col gap-6">
      <section
        class="border-divider bg-surface shadow-card rounded-lg border p-5"
      >
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-4">
            <Avatar
              :label="authStore.userInitials"
              shape="circle"
              class="size-10"
              :pt="{
                root: 'bg-accent-tint text-brand text-xs font-semibold',
              }"
            />
            <div class="flex flex-col gap-0.5">
              <p class="text-text-dark text-sm font-semibold">
                {{ authStore.displayName }}
              </p>
              <p class="text-text-muted text-xs">Workspace member</p>
            </div>
          </div>

          <div class="grid gap-4">
            <div class="flex flex-col gap-1">
              <label
                for="profile-display-name"
                class="text-text-dark text-[13px] font-medium"
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
                class="text-text-dark text-[13px] font-medium"
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
        class="border-divider bg-surface shadow-card rounded-lg border p-5"
      >
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-text-dark text-base font-semibold">
              GitHub Connection
            </h2>
            <p class="text-text-muted text-xs">
              Connect your account to start timers from organizations,
              repositories, and issues.
            </p>
          </div>

          <div
            class="text-text-muted grid gap-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
          >
            <div class="grid gap-2">
              <p>Connected account</p>
              <p>Scopes</p>
            </div>
            <div class="text-text-dark grid gap-2 text-right">
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
