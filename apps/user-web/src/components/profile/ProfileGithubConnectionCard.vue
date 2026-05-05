<script setup lang="ts">
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import Skeleton from "primevue/skeleton";
import Tag from "primevue/tag";
import type { GitHubConnectionStatusResponse } from "@gitiempo/shared";

import SurfaceCard from "@/components/layout/SurfaceCard.vue";

const props = defineProps<{
  isConnecting: boolean;
  isDisconnecting: boolean;
  requestErrorMessage: string | null;
  status: "connected" | "connecting" | "disconnected" | "loading" | "request-error";
  value: GitHubConnectionStatusResponse | null;
}>();

const emit = defineEmits<{
  connect: [];
  disconnect: [];
  refresh: [];
}>();
</script>

<template>
  <SurfaceCard body-class="flex flex-col gap-4">
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h2 class="text-text-dark text-base font-semibold">
          GitHub Connection
        </h2>
        <p class="text-text-muted text-xs">
          Connect your account to start timers from organizations,
          repositories, and issues.
        </p>
      </div>

      <Tag
        v-if="props.status !== 'loading'"
        :severity="
          props.status === 'connected'
            ? 'success'
            : props.status === 'connecting'
              ? 'warn'
              : props.status === 'request-error'
                ? 'danger'
                : 'secondary'
        "
        :value="
          props.status === 'connected'
            ? 'Connected'
            : props.status === 'connecting'
              ? 'Connecting'
              : props.status === 'request-error'
                ? 'Error'
                : 'Disconnected'
        "
        :pt="{
          root:
            props.status === 'connected'
              ? 'rounded-sm bg-status-active-bg px-2 py-1 text-[10px] font-semibold text-status-active-text'
              : props.status === 'connecting'
                ? 'rounded-sm px-2 py-1 text-[10px] font-semibold'
                : props.status === 'request-error'
                  ? 'rounded-sm px-2 py-1 text-[10px] font-semibold'
                  : 'rounded-sm px-2 py-1 text-[10px] font-semibold',
          label: 'leading-none',
        }"
      />
    </div>

    <template v-if="props.status === 'loading'">
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

    <template v-else-if="props.status === 'connected' && props.value?.status === 'connected'">
      <dl
        class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 text-xs sm:items-start"
      >
        <dt class="text-text-muted">
          GitHub user ID
        </dt>
        <dd class="text-text-dark m-0 text-left font-medium sm:text-right">
          {{ props.value.account.githubUserId }}
        </dd>

        <dt class="text-text-muted">
          Login
        </dt>
        <dd class="text-text-dark m-0 text-left font-medium sm:text-right">
          {{ props.value.account.login }}
        </dd>

        <template v-if="props.value.account.avatarUrl">
          <dt class="text-text-muted">
            Avatar
          </dt>
          <dd class="text-text-dark m-0 flex text-left sm:justify-end">
            <Avatar
              :image="props.value.account.avatarUrl"
              shape="circle"
              class="size-8"
            />
          </dd>
        </template>

        <dt class="text-text-muted">
          Connected at
        </dt>
        <dd class="text-text-dark m-0 text-left font-medium sm:text-right">
          {{ props.value.account.connectedAt }}
        </dd>

        <dt class="text-text-muted">
          Updated at
        </dt>
        <dd class="text-text-dark m-0 text-left font-medium sm:text-right">
          {{ props.value.account.updatedAt }}
        </dd>
      </dl>

      <div class="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          label="Reconnect"
          severity="secondary"
          variant="outlined"
          size="small"
          :disabled="props.isDisconnecting"
          :loading="props.isConnecting"
          @click="emit('connect')"
        />
        <Button
          type="button"
          label="Disconnect"
          severity="danger"
          variant="outlined"
          size="small"
          :disabled="props.isConnecting"
          :loading="props.isDisconnecting"
          @click="emit('disconnect')"
        />
      </div>
    </template>

    <template v-else-if="props.status === 'connecting'">
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

    <template v-else-if="props.status === 'request-error'">
      <p class="text-text-muted text-sm leading-5">
        The last GitHub request failed. Retry the action or reconnect your
        account.
      </p>
      <p class="text-text-muted text-sm leading-5">
        {{ props.requestErrorMessage ?? 'Retry the request or start a fresh connection flow.' }}
      </p>
      <div class="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          label="Retry"
          severity="secondary"
          variant="outlined"
          size="small"
          @click="emit('refresh')"
        />
        <Button
          type="button"
          label="Connect GitHub"
          size="small"
          :loading="props.isConnecting"
          @click="emit('connect')"
        />
      </div>
    </template>

    <template v-else>
      <p class="text-text-muted text-sm leading-5">
        Connect GitHub to enable provider-backed timer sync.
      </p>
      <div class="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          label="Refresh status"
          severity="secondary"
          variant="outlined"
          size="small"
          @click="emit('refresh')"
        />
        <Button
          type="button"
          label="Connect GitHub"
          size="small"
          :loading="props.isConnecting"
          @click="emit('connect')"
        />
      </div>
    </template>
  </SurfaceCard>
</template>
