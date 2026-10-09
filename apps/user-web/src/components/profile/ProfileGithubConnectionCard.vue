<script setup lang="ts">
import { computed } from "vue";
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import Skeleton from "primevue/skeleton";
import Tag from "primevue/tag";

import { SurfaceCard } from "@gitiempo/web-shared";
import { useProfileGithubConnection } from "@/composables/profile/useProfileGithubConnection";
import { formatLocalTimestampLabel } from "@/lib/time-formatters";

const {
  connect,
  authorizePersonalData,
  connection,
  isAuthorizingPersonalData,
  isConnecting,
  isDisconnecting,
  refreshConnectionStatus,
  requestDisconnect,
  requestErrorMessage,
  state,
} = useProfileGithubConnection();

const statusTagConfig = computed(() => {
  switch (state.value) {
    case "connected":
      return {
        ptRoot:
          "rounded-sm bg-status-active-bg px-2 py-1 text-[10px] font-semibold text-status-active-text",
        severity: "success" as const,
        value: "Connected",
      };

    case "connecting":
      return {
        ptRoot: "rounded-sm px-2 py-1 text-[10px] font-semibold",
        severity: "warn" as const,
        value: "Connecting",
      };

    case "request-error":
      return {
        ptRoot: "rounded-sm px-2 py-1 text-[10px] font-semibold",
        severity: "danger" as const,
        value: "Error",
      };

    case "disconnected":
      return {
        ptRoot: "rounded-sm px-2 py-1 text-[10px] font-semibold",
        severity: "secondary" as const,
        value: "Disconnected",
      };

    default:
      return null;
  }
});

const connectedAtLabel = computed(() =>
  connection.value?.status === "connected"
    ? formatLocalTimestampLabel(connection.value.account.connectedAt)
    : "",
);
const updatedAtLabel = computed(() =>
  connection.value?.status === "connected"
    ? formatLocalTimestampLabel(connection.value.account.updatedAt)
    : "",
);
const oauthNeedsRecovery = computed(
  () =>
    connection.value?.oauth.status === "not_authorized" ||
    connection.value?.oauth.status === "reauthorization_required",
);
const organizationDiscoveryReady = computed(
  () => connection.value?.capabilities.organizationDiscovery === "ready",
);
const personalDataReady = computed(
  () => connection.value?.capabilities.personalData === "ready",
);
const hasMissingOAuthPermissions = computed(
  () => (connection.value?.oauth.missingScopes.length ?? 0) > 0,
);
const canDisconnect = computed(
  () => connection.value?.disconnect === "allowed",
);
</script>

<template>
  <SurfaceCard
    border
    body-class="flex flex-col gap-4"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h2 class="text-text-dark text-base font-semibold">
          GitHub Connection
        </h2>
        <p class="text-text-muted text-xs">
          Connect your GitHub identity to discover organizations. Authorize
          private GitHub data separately when needed.
        </p>
      </div>

      <Tag
        v-if="statusTagConfig"
        :severity="statusTagConfig.severity"
        :value="statusTagConfig.value"
        :pt="{
          root: statusTagConfig.ptRoot,
          label: 'leading-none',
        }"
      />
    </div>

    <template v-if="state === 'loading'">
      <div class="flex flex-col gap-4">
        <Skeleton
          height="1rem"
          border-radius="6px"
        />
        <Skeleton
          width="52%"
          height="1.75rem"
          border-radius="999px"
        />
        <Skeleton
          height="3.5rem"
          border-radius="10px"
        />
        <Skeleton
          height="2rem"
          border-radius="6px"
        />
      </div>
    </template>

    <template v-else-if="state === 'connected' && connection?.status === 'connected'">
      <dl
        class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 text-xs sm:items-start"
      >
        <dt class="text-text-muted">
          GitHub user ID
        </dt>
        <dd class="text-text-dark m-0 text-left font-medium sm:text-right">
          {{ connection.account.githubUserId }}
        </dd>

        <dt class="text-text-muted">
          Login
        </dt>
        <dd class="text-text-dark m-0 text-left font-medium sm:text-right">
          {{ connection.account.login }}
        </dd>

        <template v-if="connection.account.avatarUrl">
          <dt class="text-text-muted">
            Avatar
          </dt>
          <dd class="text-text-dark m-0 flex text-left sm:justify-end">
            <Avatar
              :image="connection.account.avatarUrl"
              shape="circle"
              class="size-8"
            />
          </dd>
        </template>

        <dt class="text-text-muted">
          Connected at
        </dt>
        <dd class="text-text-dark m-0 text-left font-medium sm:text-right">
          {{ connectedAtLabel }}
        </dd>

        <dt class="text-text-muted">
          Updated at
        </dt>
        <dd class="text-text-dark m-0 text-left font-medium sm:text-right">
          {{ updatedAtLabel }}
        </dd>
      </dl>

      <div
        v-if="!organizationDiscoveryReady"
        data-testid="profile-github-oauth-recovery"
        class="border-divider bg-app-bg rounded-lg border p-3 text-sm leading-5"
      >
        <p class="text-text-dark font-medium">
          Organization access needs permission
        </p>
        <p class="text-text-muted">
          {{ oauthNeedsRecovery
            ? 'Reconnect GitHub to grant the organization permissions needed for workspace setup.'
            : 'GitHub organization access is not available for this account yet.' }}
        </p>
      </div>

      <div
        v-else-if="hasMissingOAuthPermissions"
        data-testid="profile-github-oauth-permission-recovery"
        class="border-divider bg-app-bg rounded-lg border p-3 text-sm leading-5"
      >
        <p class="text-text-dark font-medium">
          GitHub account permissions need attention
        </p>
        <p class="text-text-muted">
          Reconnect GitHub to finish your account permissions.
        </p>
      </div>

      <div
        v-if="!personalDataReady"
        data-testid="profile-github-personal-data-recovery"
        class="border-divider bg-app-bg rounded-lg border p-3 text-sm leading-5"
      >
        <p class="text-text-dark font-medium">
          Private GitHub data needs a separate authorization
        </p>
        <p class="text-text-muted">
          Authorize GitHub App access to browse repositories, issues, and Projects.
        </p>
      </div>

      <p
        v-if="connection.disconnect !== 'allowed'"
        data-testid="profile-github-disconnect-guidance"
        class="text-text-muted text-xs leading-4"
      >
        {{ connection.disconnect === 'alternative_signin_required'
          ? 'Add another sign-in method before disconnecting GitHub to keep access to GiTiempo.'
          : 'GiTiempo cannot verify another sign-in method right now. Retry later before disconnecting GitHub.' }}
      </p>

      <div class="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          label="Reconnect"
          severity="secondary"
          variant="outlined"
          size="small"
          :disabled="isDisconnecting"
          :loading="isConnecting"
          @click="connect"
        />
        <Button
          v-if="!personalDataReady"
          type="button"
          label="Authorize GitHub data"
          severity="secondary"
          variant="outlined"
          size="small"
          :disabled="isDisconnecting || isConnecting"
          :loading="isAuthorizingPersonalData"
          @click="authorizePersonalData"
        />
        <Button
          type="button"
          label="Disconnect"
          severity="danger"
          variant="outlined"
          size="small"
          :disabled="isConnecting || isAuthorizingPersonalData || !canDisconnect"
          :loading="isDisconnecting"
          @click="requestDisconnect"
        />
      </div>
    </template>

    <template v-else-if="state === 'connecting'">
      <p class="text-text-muted text-sm leading-5">
        The app is preparing your GitHub authorization flow and redirecting
        you to GitHub.
      </p>
      <p class="text-text-muted text-sm leading-5">
        Redirecting you to GitHub for approval.
      </p>
      <div class="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          label="Connecting..."
          size="small"
          loading
          disabled
        />
      </div>
    </template>

    <template v-else-if="state === 'request-error'">
      <p class="text-text-muted text-sm leading-5">
        The last GitHub request failed. Retry the action or reconnect your
        account.
      </p>
      <p class="text-text-muted text-sm leading-5">
        {{ requestErrorMessage ?? 'Retry the request or start a fresh connection flow.' }}
      </p>
      <div class="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          label="Retry"
          severity="secondary"
          variant="outlined"
          size="small"
          @click="refreshConnectionStatus"
        />
        <Button
          type="button"
          label="Connect GitHub"
          size="small"
          :loading="isConnecting"
          @click="connect"
        />
      </div>
    </template>

    <template v-else>
      <p class="text-text-muted text-sm leading-5">
        Connect GitHub to discover organizations. Authorize private GitHub
        data separately when needed.
      </p>
      <div class="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          label="Refresh status"
          severity="secondary"
          variant="outlined"
          size="small"
          @click="refreshConnectionStatus"
        />
        <Button
          type="button"
          label="Connect GitHub"
          size="small"
          :loading="isConnecting"
          @click="connect"
        />
      </div>
    </template>
  </SurfaceCard>
</template>
