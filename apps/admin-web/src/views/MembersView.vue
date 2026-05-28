<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type {
  ProjectListResponse,
  WorkspaceInviteListResponse,
  WorkspaceInviteResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { SectionHeader, StatCard, SurfaceCard } from '@gitiempo/web-shared';
import Button from 'primevue/button';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import MemberInviteDialog from '@/components/forms/MemberInviteDialog.vue';
import MembersTable from '@/components/MembersTable.vue';
import PendingInvitationsCard from '@/components/PendingInvitationsCard.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useConfirmation } from '@/composables/useConfirmation';
import { useToasts } from '@/composables/useToasts';
import { adminMembersClient } from '@/services/admin-members-client';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { requireConfirmation } = useConfirmation();
const { errorToast, successToast } = useToasts();

const members = ref<WorkspaceMemberListResponse>([]);
const invites = ref<WorkspaceInviteListResponse>([]);
const projects = ref<ProjectListResponse>([]);
const loading = ref(true);
const invitesLoading = ref(true);
const loadError = ref<string | null>(null);
const invitesLoadError = ref<string | null>(null);
const initialLoaded = ref(false);
const inviteDialogVisible = ref(false);
const resendingInviteId = ref<string | null>(null);
const cancelingInviteId = ref<string | null>(null);

interface LoadDataOptions {
  errorAction: string;
  setError?: boolean;
  setInitialLoaded?: boolean;
}

interface LoadInvitesOptions {
  errorAction: string;
  setErrorState?: boolean;
}

const currentUserId = computed(() => authStore.profile?.id ?? null);
const pendingInviteRows = computed(() =>
  invites.value.filter((invite) => invite.status === 'pending'),
);

const activeMembers = computed(() => members.value.length);
const pendingInvites = computed<number | string>(() =>
  invitesLoadError.value && pendingInviteRows.value.length === 0
    ? '—'
    : pendingInviteRows.value.length,
);
const pmsAssigned = computed(
  () => members.value.filter((m) => m.role === 'pm').length,
);

async function loadData({
  errorAction,
  setError = false,
  setInitialLoaded = false,
}: LoadDataOptions): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  loading.value = true;
  if (setError) {
    loadError.value = null;
  }

  try {
    const [membersData, projectsData] = await Promise.all([
      adminMembersClient.listMembers(token),
      adminProjectsClient.listProjects(token),
    ]);

    members.value = membersData;
    projects.value = projectsData;
    if (setInitialLoaded) {
      initialLoaded.value = true;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (setError) {
      loadError.value = message;
    }
    errorToast(message, {
      error: err,
      logContext: { action: errorAction, feature: 'members' },
    });
  } finally {
    loading.value = false;
  }
}

async function loadInvites({
  errorAction,
  setErrorState = false,
}: LoadInvitesOptions): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  invitesLoading.value = true;
  if (setErrorState) {
    invitesLoadError.value = null;
  }

  try {
    invites.value = await adminMembersClient.listInvites(token);
    invitesLoadError.value = null;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (setErrorState && invites.value.length === 0) {
      invitesLoadError.value = message;
    }
    errorToast(message, {
      error: err,
      logContext: { action: errorAction, feature: 'members' },
    });
  } finally {
    invitesLoading.value = false;
  }
}

async function fetchAll(): Promise<void> {
  await Promise.all([
    loadData({
      errorAction: 'load-members',
      setError: true,
      setInitialLoaded: true,
    }),
    loadInvites({
      errorAction: 'load-pending-invites',
      setErrorState: true,
    }),
  ]);
}

async function refreshMembers(): Promise<void> {
  await loadData({ errorAction: 'refresh-members' });
}

async function refreshPendingInvites(): Promise<void> {
  await loadInvites({
    errorAction: 'refresh-pending-invites',
  });
}

function handleInviteCreated(): void {
  refreshPendingInvites();
}

async function handleResendInvite(invite: WorkspaceInviteResponse): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  resendingInviteId.value = invite.id;

  try {
    await adminMembersClient.resendInvite(token, invite.id);
    successToast(`Invitation resent to ${invite.email}.`);
    await refreshPendingInvites();
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to resend invite', {
      error: err,
      logContext: { action: 'resend-invite', feature: 'members' },
    });
  } finally {
    resendingInviteId.value = null;
  }
}

function handleCancelInvite(invite: WorkspaceInviteResponse): void {
  requireConfirmation(
    `${invite.email} will lose access to this invitation. This action cannot be undone.`,
    'Cancel invite?',
    'Cancel invite',
    async () => {
      const token = authStore.accessToken;

      if (!token) {
        return;
      }

      cancelingInviteId.value = invite.id;

      try {
        await adminMembersClient.cancelInvite(token, invite.id);
        successToast(`Invitation canceled for ${invite.email}.`);
        await refreshPendingInvites();
      } catch (err) {
        errorToast(err instanceof Error ? err.message : 'Failed to cancel invite', {
          error: err,
          logContext: { action: 'cancel-invite', feature: 'members' },
        });
      } finally {
        cancelingInviteId.value = null;
      }
    },
  );
}

onMounted(fetchAll);
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="loading && !initialLoaded">
      <ManagementPageSkeleton variant="members" />
    </template>

    <template v-else-if="loadError && !loading">
      <RequestErrorCard
        title="Failed to load members"
        :message="loadError"
        @retry="fetchAll"
      />
    </template>

    <template v-else>
      <SectionHeader
        title="Members"
        description="Manage team roles, project assignments, and member activity."
        variant="page"
      >
        <template #actions>
          <Button
            label="Invite Member"
            @click="inviteDialogVisible = true"
          />
        </template>
      </SectionHeader>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Active Members"
          :value="activeMembers"
        />
        <StatCard
          label="Pending Invites"
          :value="pendingInvites"
        />
        <StatCard
          label="PMs Assigned"
          :value="pmsAssigned"
        />
      </div>

      <SurfaceCard padding-class="p-5">
        <MembersTable
          :members="members"
          :projects="projects"
          :loading="loading"
          :current-user-id="currentUserId"
          @member-removed="refreshMembers"
          @role-updated="refreshMembers"
          @assignments-updated="refreshMembers"
        />
      </SurfaceCard>

      <PendingInvitationsCard
        :canceling-invite-id="cancelingInviteId"
        :error-message="invitesLoadError"
        :loading="invitesLoading"
        :pending-invites="pendingInviteRows"
        :resending-invite-id="resendingInviteId"
        @retry="loadInvites({ errorAction: 'retry-pending-invites', setErrorState: true })"
        @resend="handleResendInvite"
        @cancel="handleCancelInvite"
      />
    </template>

    <MemberInviteDialog
      v-model:visible="inviteDialogVisible"
      @created="handleInviteCreated"
    />
  </div>
</template>
