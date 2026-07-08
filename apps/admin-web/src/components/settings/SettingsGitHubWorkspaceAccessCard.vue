<script setup lang="ts">
import { computed } from 'vue';
import type {
  GitHubConnectionStatusResponse,
  WorkspaceGitHubOrganizationResponse,
} from '@gitiempo/shared';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Skeleton from 'primevue/skeleton';
import RequestErrorBlock from '../RequestErrorBlock.vue';
import SettingsCard from './SettingsCard.vue';
import type { GitHubWorkspaceAccessChecklist } from './github-workspace-access';

const organizationLogin = defineModel<string>('organizationLogin', {
  required: true,
});

const props = defineProps<{
  adding: boolean;
  githubConnectionLoading: boolean;
  githubConnectionRequestError: string | null;
  githubConnectionStatus: GitHubConnectionStatusResponse | null;
  githubProfileUrl: string | null;
  isInitialLoading: boolean;
  items: readonly WorkspaceGitHubOrganizationResponse[];
  organizationLoginError: string | null;
  recoveryChecklist: GitHubWorkspaceAccessChecklist | null;
  removingOrganizationId: string | null;
  requestError: string | null;
}>();

const emit = defineEmits<{
  add: [];
  remove: [organizationId: string];
  retry: [];
  retryAdd: [];
  retryGithubConnection: [];
}>();

const connectedAccount = computed(() =>
  props.githubConnectionStatus?.status === 'connected'
    ? props.githubConnectionStatus.account
    : null,
);
const isGitHubConnected = computed(
  () =>
    !props.githubConnectionLoading &&
    !props.githubConnectionRequestError &&
    connectedAccount.value !== null,
);
const accountInitials = computed(() => {
  const login = connectedAccount.value?.login.trim();

  return login ? login.slice(0, 2).toUpperCase() : undefined;
});
</script>

<template>
  <SettingsCard
    title="GitHub Workspace Access"
    description="Choose which GitHub organizations this workspace can use. Members still only see data their connected GitHub account can access."
  >
    <section class="flex flex-col gap-3">
      <div class="flex flex-col gap-1">
        <h3 class="text-text-dark text-base font-semibold">
          GitHub account
        </h3>
        <p class="text-text-muted text-[13px] leading-5">
          Connect the GitHub account used to validate organization access before
          saving workspace policy changes.
        </p>
      </div>

      <div
        v-if="githubConnectionRequestError"
        data-testid="settings-github-account-error"
      >
        <RequestErrorBlock
          :message="githubConnectionRequestError"
          title="Failed to load GitHub account"
          @retry="emit('retryGithubConnection')"
        />
      </div>

      <div
        v-else-if="githubConnectionLoading"
        data-testid="settings-github-account-loading"
        class="border-divider bg-surface-secondary flex items-center gap-3 rounded-lg border p-3.5"
      >
        <Skeleton
          width="2rem"
          height="2rem"
          border-radius="999px"
        />
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton
            width="8rem"
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

      <div
        v-else-if="connectedAccount"
        data-testid="settings-github-account-connected"
        class="border-divider bg-surface-secondary flex items-center gap-3 rounded-lg border p-3.5"
      >
        <Avatar
          class="size-8 shrink-0"
          :image="connectedAccount.avatarUrl ?? undefined"
          :label="accountInitials"
          shape="circle"
          :pt="{ root: 'bg-accent-tint text-brand text-[13px] font-semibold' }"
        />
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="text-text-dark truncate text-sm font-semibold">
            {{ connectedAccount.login }}
          </span>
          <span class="text-text-muted text-xs leading-4">
            Connected GitHub account
          </span>
        </div>
      </div>

      <div
        v-else
        data-testid="settings-github-account-disconnected"
        class="border-divider bg-surface-secondary flex flex-col gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <span class="text-text-dark text-sm font-semibold">
            GitHub is not connected
          </span>
          <span class="text-text-muted text-[13px] leading-5">
            Connect GitHub in your user profile before adding organizations to
            this workspace.
          </span>
        </div>

        <Button
          v-if="githubProfileUrl"
          :as-child="true"
          class="sm:shrink-0"
          label="Connect GitHub"
        >
          <template #default="{ a11yAttrs, class: buttonClass }">
            <a
              v-bind="a11yAttrs"
              aria-label="Open user profile GitHub connection settings"
              :class="buttonClass"
              data-testid="settings-github-account-profile-link"
              :href="githubProfileUrl"
            >
              Connect GitHub
            </a>
          </template>
        </Button>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex flex-col gap-1">
        <h3 class="text-text-dark text-base font-semibold">
          Allowed organizations
        </h3>
        <p class="text-text-muted text-[13px] leading-5">
          Workspace members can use only the GitHub organizations listed here
          when working inside this workspace.
        </p>
      </div>

      <div
        v-if="requestError"
        data-testid="settings-github-organizations-error"
      >
        <RequestErrorBlock
          :message="requestError"
          title="Failed to load GitHub workspace access"
          @retry="emit('retry')"
        />
      </div>

      <div
        v-else-if="isInitialLoading"
        data-testid="settings-github-organizations-loading"
        class="flex flex-col gap-3"
      >
        <div
          v-for="index in 2"
          :key="index"
          class="border-divider bg-surface-secondary flex items-center justify-between gap-4 rounded-lg border p-3.5"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton
              width="8rem"
              height="0.875rem"
              border-radius="4px"
            />
            <Skeleton
              width="10rem"
              height="0.75rem"
              border-radius="4px"
            />
          </div>
          <Skeleton
            width="4.5rem"
            height="2.25rem"
            border-radius="6px"
          />
        </div>
      </div>

      <div
        v-else-if="items.length === 0"
        data-testid="settings-github-organizations-empty"
        class="border-divider bg-surface-secondary rounded-lg border p-4"
      >
        <p class="text-text-muted text-[13px] leading-5">
          No GitHub organizations are allowed for this workspace yet.
        </p>
      </div>

      <div
        v-else
        class="flex flex-col gap-3"
      >
        <div
          v-for="organization in items"
          :key="organization.id"
          :data-testid="`settings-github-organization-row-${organization.id}`"
          class="border-divider bg-surface-secondary flex items-center justify-between gap-4 rounded-lg border p-3.5"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-text-dark truncate text-sm font-semibold">
              {{ organization.organizationLogin }}
            </span>
            <span class="text-text-muted text-xs leading-4">
              Allowed for this workspace
            </span>
          </div>
          <Button
            label="Remove"
            severity="secondary"
            outlined
            size="small"
            :disabled="adding"
            :loading="removingOrganizationId === organization.id"
            @click="emit('remove', organization.id)"
          />
        </div>
      </div>
    </section>

    <section
      v-if="recoveryChecklist"
      class="flex flex-col gap-3"
    >
      <div class="flex flex-col gap-1">
        <h3 class="text-text-dark text-base font-semibold">
          GitHub App access
        </h3>
        <p class="text-text-muted text-[13px] leading-5">
          Complete these steps when GiTiempo cannot validate the organization
          yet because GitHub access, app approval, or the current connection
          still needs attention.
        </p>
      </div>

      <div class="flex flex-col gap-3">
        <div
          v-for="step in recoveryChecklist.steps"
          :key="step.id"
          :data-testid="`settings-github-recovery-step-${step.id}`"
          class="border-divider bg-surface-secondary flex flex-col justify-between gap-3 rounded-lg border p-3"
        >
          <h4 class="text-text-dark text-sm font-semibold">
            {{ step.title }}
          </h4>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-text-muted text-[13px] leading-5 sm:max-w-[23rem]">
              {{ step.description }}
            </p>

            <Button
              v-if="step.action?.kind === 'retry'"
              class="sm:shrink-0"
              :label="step.action.label"
              :disabled="!isGitHubConnected || adding"
              :loading="adding"
              @click="emit('retryAdd')"
            />

            <Button
              v-else-if="step.action?.kind === 'link'"
              :as-child="true"
              :label="step.action.label"
              severity="secondary"
              variant="outlined"
            >
              <template #default="{ a11yAttrs, class: buttonClass }">
                <a
                  v-bind="a11yAttrs"
                  :aria-label="step.action.ariaLabel"
                  :class="[buttonClass, 'sm:shrink-0']"
                  :data-testid="`settings-github-recovery-link-${step.id}`"
                  :href="step.action.href"
                  :rel="step.action.target === '_blank' ? 'noopener noreferrer' : undefined"
                  :target="step.action.target"
                >
                  {{ step.action.label }}
                </a>
              </template>
            </Button>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="isGitHubConnected"
      class="flex flex-col gap-2.5"
    >
      <div class="flex flex-col gap-1">
        <h3 class="text-text-dark text-base font-semibold">
          Add organization
        </h3>
        <p class="text-text-muted text-[13px] leading-5">
          Add another GitHub organization to the workspace allow-list.
        </p>
        <p class="text-text-muted text-xs leading-4">
          Use the GitHub organization login, for example <code>octo-org</code>.
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <label
            for="settings-github-organization-login"
            class="text-text-dark text-[13px] font-medium"
          >
            Organization login
          </label>
          <InputText
            id="settings-github-organization-login"
            v-model="organizationLogin"
            class="h-[38px] w-full"
            :disabled="adding"
            :invalid="!!organizationLoginError"
            autocomplete="off"
          />
          <Message
            v-if="organizationLoginError"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ organizationLoginError }}
          </Message>
        </div>

        <Button
          class="sm:shrink-0"
          label="Add organization"
          :loading="adding"
          @click="emit('add')"
        />
      </div>
    </section>
  </SettingsCard>
</template>
