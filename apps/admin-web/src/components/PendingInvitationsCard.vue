<script setup lang="ts">
import { PaperAirplaneIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { computed } from 'vue';
import type { WorkspaceInviteResponse } from '@gitiempo/shared';
import {
  EmptyStateBlock,
  ManagementTableRowAction,
  ManagementTableShell,
  MobileRecordCard,
  SurfaceCard,
  formatWorkspaceRole,
  managementTableColumnPt,
  useIsMobileViewport,
} from '@gitiempo/web-shared';
import type { ManagementTableColumn } from '@gitiempo/web-shared';
import Column from 'primevue/column';
import MobileRecordMetadataList from '@/components/MobileRecordMetadataList.vue';
import RequestErrorBlock from '@/components/RequestErrorBlock.vue';
import ManagementDesktopRowSkeleton from '@/components/loading/ManagementDesktopRowSkeleton.vue';
import ManagementMobileCardSkeleton from '@/components/loading/ManagementMobileCardSkeleton.vue';

const props = withDefaults(
  defineProps<{
    cancelingInviteId?: string | null;
    errorMessage?: string | null;
    loading: boolean;
    pendingInvites: WorkspaceInviteResponse[];
    resendingInviteId?: string | null;
  }>(),
  {
    cancelingInviteId: null,
    errorMessage: null,
    resendingInviteId: null,
  },
);

const emit = defineEmits<{
  retry: [];
  resend: [invite: WorkspaceInviteResponse];
  cancel: [invite: WorkspaceInviteResponse];
}>();

const isMobileViewport = useIsMobileViewport();

const columns: ManagementTableColumn[] = [
  { key: 'email', label: 'Email', width: 'fill' },
  { key: 'role', label: 'Role', width: 140 },
  { key: 'expires', label: 'Expires', width: 180 },
  { key: 'actions', label: 'Actions', width: 140, align: 'end' },
];

const expiresFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

const pendingCountLabel = computed(() => {
  const count = props.pendingInvites.length;

  return `${count} pending`;
});

const showErrorState = computed(
  () => !props.loading && props.pendingInvites.length === 0 && !!props.errorMessage,
);

function formatExpires(expiresAt: string): string {
  const parsed = new Date(expiresAt);

  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return expiresFormatter.format(parsed);
}

function formatSent(createdAt: string): string {
  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) {
    return 'Sent recently';
  }

  const deltaMs = parsed.getTime() - Date.now();
  const absoluteMinutes = Math.abs(deltaMs) / (60 * 1000);

  if (absoluteMinutes < 60) {
    return `Sent ${relativeTimeFormatter.format(
      Math.round(deltaMs / (60 * 1000)),
      'minute',
    )}`;
  }

  const absoluteHours = absoluteMinutes / 60;

  if (absoluteHours < 24) {
    return `Sent ${relativeTimeFormatter.format(
      Math.round(deltaMs / (60 * 60 * 1000)),
      'hour',
    )}`;
  }

  return `Sent ${relativeTimeFormatter.format(
    Math.round(deltaMs / (24 * 60 * 60 * 1000)),
    'day',
  )}`;
}

function isRowBusy(inviteId: string): boolean {
  return (
    props.resendingInviteId === inviteId || props.cancelingInviteId === inviteId
  );
}
</script>

<template>
  <SurfaceCard padding-class="p-5">
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex min-w-0 flex-col gap-1">
          <h2 class="text-text-dark text-lg font-semibold">
            Pending Invitations
          </h2>
          <p class="text-text-muted text-[13px]">
            Resend access emails or cancel outstanding invites.
          </p>
        </div>
        <span class="text-text-muted shrink-0 text-[13px] font-medium">
          {{ pendingCountLabel }}
        </span>
      </div>

      <div
        v-if="showErrorState"
      >
        <RequestErrorBlock
          :message="props.errorMessage ?? 'An unexpected error occurred'"
          title="Failed to load pending invitations"
          @retry="emit('retry')"
        />
      </div>

      <template v-else-if="props.loading && isMobileViewport">
        <div class="flex flex-col gap-3">
          <ManagementMobileCardSkeleton
            v-for="index in 2"
            :key="index"
            data-testid="pending-invite-mobile-loading-card"
            :index="index"
            variant="pendingInvites"
          />
        </div>
      </template>

      <template v-else-if="props.loading">
        <div class="border-divider overflow-hidden rounded-[6px] border">
          <div class="border-divider bg-app-bg text-text-dark flex h-[44px] min-w-[700px] items-center border-b font-sans text-[13px] font-semibold">
            <div
              v-for="column in columns"
              :key="column.key"
              class="px-3"
              :style="{
                width:
                  column.width === 'fill' || column.width === undefined
                    ? undefined
                    : `${column.width}px`,
                flex:
                  column.width === 'fill' || column.width === undefined
                    ? '1'
                    : undefined,
                textAlign: column.align ?? 'start',
              }"
            >
              {{ column.label }}
            </div>
          </div>

          <div class="min-w-[700px]">
            <ManagementDesktopRowSkeleton
              v-for="index in 3"
              :key="index"
              variant="pendingInvites"
            />
          </div>
        </div>
      </template>

      <template v-else-if="isMobileViewport && props.pendingInvites.length > 0">
        <div class="flex flex-col gap-3">
          <MobileRecordCard
            v-for="invite in props.pendingInvites"
            :key="invite.id"
            data-testid="pending-invite-mobile-card"
          >
            <div class="min-w-0">
              <h3 class="text-text-dark truncate text-[15px] font-semibold">
                {{ invite.email }}
              </h3>
              <p class="text-text-muted text-[12px]">
                {{ formatSent(invite.createdAt) }}
              </p>
            </div>

            <MobileRecordMetadataList
              :items="[
                { label: 'Role', value: formatWorkspaceRole(invite.role) },
                { label: 'Expires', value: formatExpires(invite.expiresAt) },
              ]"
            />

            <template #actions>
              <ManagementTableRowAction
                :data-testid="`pending-invite-mobile-resend-${invite.id}`"
                :disabled="isRowBusy(invite.id)"
                :icon="PaperAirplaneIcon"
                label="Resend invite"
                :loading="props.resendingInviteId === invite.id"
                @click="emit('resend', invite)"
              />
              <ManagementTableRowAction
                :data-testid="`pending-invite-mobile-cancel-${invite.id}`"
                :disabled="isRowBusy(invite.id)"
                :icon="TrashIcon"
                label="Cancel invite"
                :loading="props.cancelingInviteId === invite.id"
                tone="destructive"
                @click="emit('cancel', invite)"
              />
            </template>
          </MobileRecordCard>
        </div>
      </template>

      <ManagementTableShell
        v-else-if="props.pendingInvites.length > 0"
        :columns="columns"
        data-key="id"
        :loading="false"
        shell-class="border-divider overflow-x-auto rounded-[6px] border"
        single-scroll
        table-class="min-w-[700px] w-full table-fixed border-collapse"
        table-container-class="overflow-visible rounded-none border-none"
        :value="props.pendingInvites"
      >
        <Column :pt="managementTableColumnPt">
          <template #body="{ data }">
            <div class="flex min-w-0 flex-col">
              <span class="text-text-dark truncate text-[14px] font-semibold">
                {{ data.email }}
              </span>
              <span class="text-text-muted text-[12px]">
                {{ formatSent(data.createdAt) }}
              </span>
            </div>
          </template>
        </Column>

        <Column
          style="width: 140px"
          :pt="managementTableColumnPt"
        >
          <template #body="{ data }">
            <span class="text-text-dark text-[13px] font-medium">
              {{ formatWorkspaceRole(data.role) }}
            </span>
          </template>
        </Column>

        <Column
          style="width: 180px"
          :pt="managementTableColumnPt"
        >
          <template #body="{ data }">
            <span class="text-text-muted text-[13px] font-normal">
              {{ formatExpires(data.expiresAt) }}
            </span>
          </template>
        </Column>

        <Column
          style="width: 140px"
          :pt="managementTableColumnPt"
        >
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-2">
              <ManagementTableRowAction
                :data-testid="`pending-invite-resend-${data.id}`"
                :disabled="isRowBusy(data.id)"
                :icon="PaperAirplaneIcon"
                label="Resend invite"
                :loading="props.resendingInviteId === data.id"
                @click="emit('resend', data)"
              />
              <ManagementTableRowAction
                :data-testid="`pending-invite-cancel-${data.id}`"
                :disabled="isRowBusy(data.id)"
                :icon="TrashIcon"
                label="Cancel invite"
                :loading="props.cancelingInviteId === data.id"
                tone="destructive"
                @click="emit('cancel', data)"
              />
            </div>
          </template>
        </Column>
      </ManagementTableShell>

      <EmptyStateBlock
        v-else
        description="New invites will appear here until they are accepted or canceled."
        title="No pending invitations"
      />
    </div>
  </SurfaceCard>
</template>
