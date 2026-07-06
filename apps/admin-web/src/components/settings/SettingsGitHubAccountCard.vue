<script setup lang="ts">
import { computed } from 'vue';
import type { GitHubConnectionStatusResponse } from '@gitiempo/shared';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';
import RequestErrorBlock from '../RequestErrorBlock.vue';
import SettingsCard from './SettingsCard.vue';

const props = defineProps<{
  connection: GitHubConnectionStatusResponse | null;
  isInitialLoading: boolean;
  profileHref: string | null;
  requestError: string | null;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const connectedAccount = computed(() =>
  props.connection?.status === 'connected' ? props.connection.account : null,
);
const avatarImage = computed(() => connectedAccount.value?.avatarUrl ?? undefined);
const avatarLabel = computed(() => {
  const login = connectedAccount.value?.login.trim();

  return login ? login.slice(0, 2).toUpperCase() : 'GH';
});
</script>

<template>
  <SettingsCard
    title="GitHub Account"
    description="Connect your current GitHub account before adding workspace organizations."
  >
    <div
      v-if="isInitialLoading"
      data-testid="settings-github-account-loading"
      class="border-divider bg-app-bg flex flex-col gap-3 rounded-lg border p-3.5"
    >
      <div class="flex items-center gap-3">
        <Skeleton
          shape="circle"
          size="2.5rem"
        />
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton
            width="9rem"
            height="0.875rem"
            border-radius="4px"
          />
          <Skeleton
            width="14rem"
            height="0.75rem"
            border-radius="4px"
          />
        </div>
      </div>
    </div>

    <div
      v-else-if="requestError"
      data-testid="settings-github-account-error"
    >
      <RequestErrorBlock
        title="Failed to load GitHub account status"
        :message="requestError"
        @retry="emit('retry')"
      />
    </div>

    <section
      v-else-if="connectedAccount"
      data-testid="settings-github-account-connected"
      class="border-divider bg-app-bg flex flex-col gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex min-w-0 items-center gap-3">
        <Avatar
          :image="avatarImage"
          :label="avatarImage ? undefined : avatarLabel"
          shape="circle"
          size="large"
        />
        <div class="flex min-w-0 flex-col gap-0.5">
          <h3 class="text-text-dark truncate text-sm font-semibold">
            {{ connectedAccount.login }}
          </h3>
          <p class="text-text-muted text-xs leading-4">
            Connected GitHub account for organization validation.
          </p>
        </div>
      </div>

      <Button
        v-if="profileHref"
        :as-child="true"
        label="Manage connection"
        severity="secondary"
        variant="outlined"
      >
        <template #default="{ a11yAttrs, class: buttonClass }">
          <a
            v-bind="a11yAttrs"
            :class="[buttonClass, 'sm:shrink-0']"
            :href="profileHref"
          >
            Manage connection
          </a>
        </template>
      </Button>
    </section>

    <section
      v-else
      data-testid="settings-github-account-disconnected"
      class="border-divider bg-app-bg flex flex-col gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex min-w-0 flex-col gap-1">
        <h3 class="text-text-dark text-sm font-semibold">
          GitHub is not connected
        </h3>
        <p class="text-text-muted text-[13px] leading-5">
          Connect GitHub from your user profile before adding workspace organizations.
        </p>
      </div>

      <Button
        v-if="profileHref"
        :as-child="true"
        label="Open profile"
        severity="secondary"
        variant="outlined"
      >
        <template #default="{ a11yAttrs, class: buttonClass }">
          <a
            v-bind="a11yAttrs"
            :class="[buttonClass, 'sm:shrink-0']"
            :href="profileHref"
          >
            Open profile
          </a>
        </template>
      </Button>
    </section>
  </SettingsCard>
</template>
