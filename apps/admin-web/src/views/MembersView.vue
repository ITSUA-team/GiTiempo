<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type {
  ProjectListResponse,
  WorkspaceInviteListResponse,
  WorkspaceInviteResponse,
  WorkspaceMemberListResponse,
  WorkspaceMemberResponse,
  WorkspaceRole,
} from '@gitiempo/shared';
import {
  StatCard,
  SurfaceCard,
  useIsMobileViewport,
} from '@gitiempo/web-shared';
import type { MemberAssignFormInput } from '@gitiempo/web-shared';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import MemberAssignPmPanel from '@/components/forms/MemberAssignPmPanel.vue';
import MemberEditForm from '@/components/forms/MemberEditForm.vue';
import MemberInviteDialog from '@/components/forms/MemberInviteDialog.vue';
import MembersTable from '@/components/MembersTable.vue';
import PendingInvitationsCard from '@/components/PendingInvitationsCard.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useConfirmation } from '@/composables/feedback/useConfirmation';
import { useToasts } from '@/composables/feedback/useToasts';
import { useMembersTableState } from '@/composables/useMembersTableState';
import { adminMembersClient } from '@/services/admin-members-client';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { requireConfirmation } = useConfirmation();
const { errorToast, successToast } = useToasts();
const isMobileViewport = useIsMobileViewport();

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
const savingMemberAssignmentId = ref<string | null>(null);
const savingMemberRoleId = ref<string | null>(null);

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
const {
  collapseRow: collapseMemberRow,
  emptyDescription: memberTableEmptyDescription,
  expandedRows: memberTableExpandedRows,
  filters: memberTableFilters,
  lastActiveFilterOptions,
  projectFilterOptions,
  roleFilterOptions,
  rows: memberTableRows,
  setExpandedRows: setMemberTableExpandedRows,
  toggleExpansion: toggleMemberExpansion,
  updateFilters: updateMemberTableFilters,
} = useMembersTableState({
  currentUserId,
  members,
  projects,
});
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
      adminMembersClient.listMembers(),
      adminProjectsClient.listProjects(),
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
    invites.value = await adminMembersClient.listInvites();
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

function getMemberDisplayName(member: WorkspaceMemberResponse): string {
  return member.displayName?.trim() || member.email;
}

function handleRemoveMember(member: WorkspaceMemberResponse): void {
  const memberName = getMemberDisplayName(member);

  requireConfirmation(
    `${memberName} will be removed from this workspace. This action cannot be undone.`,
    'Remove member?',
    'Remove',
    async () => {
      const token = authStore.accessToken;

      if (!token) {
        return;
      }

      try {
        await adminMembersClient.removeMember(member.id);
        successToast(`${memberName} has been removed.`);
        await refreshMembers();
      } catch (err) {
        errorToast(err instanceof Error ? err.message : 'Failed to remove member', {
          error: err,
          logContext: { action: 'remove-member', feature: 'members' },
        });
      }
    },
  );
}

function handleEditMember(member: WorkspaceMemberResponse): void {
  toggleMemberExpansion(member);
}

async function handleAssignmentsSubmitted(
  member: WorkspaceMemberResponse,
  input: MemberAssignFormInput,
): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  const currentAssignedIds = new Set(
    projects.value
      .filter((project) =>
        project.isActive &&
        project.members.some((projectMember) => projectMember.userId === member.userId),
      )
      .map((project) => project.id),
  );
  const nextAssignedIds = new Set(input.projectIds);
  const projectIdsToAdd = input.projectIds.filter((id) => !currentAssignedIds.has(id));
  const projectIdsToRemove = [...currentAssignedIds].filter(
    (id) => !nextAssignedIds.has(id),
  );

  savingMemberAssignmentId.value = member.id;

  try {
    for (const projectId of projectIdsToAdd) {
      await adminProjectsClient.assignMember(projectId, member.userId);
    }
    for (const projectId of projectIdsToRemove) {
      await adminProjectsClient.removeAssignment(projectId, member.userId);
    }

    successToast(`Project assignments for ${getMemberDisplayName(member)} saved.`);
    collapseMemberRow(member);
    await refreshMembers();
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to save assignments', {
      error: err,
      logContext: { action: 'save-project-assignments', feature: 'members' },
    });
  } finally {
    savingMemberAssignmentId.value = null;
  }
}

async function handleRoleSubmitted(
  member: WorkspaceMemberResponse,
  role: WorkspaceRole,
): Promise<void> {
  if (role === member.role) {
    collapseMemberRow(member);
    return;
  }

  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  savingMemberRoleId.value = member.id;

  try {
    await adminMembersClient.updateMemberRole(member.id, { role });
    successToast(`Role for ${getMemberDisplayName(member)} changed to ${role}.`);
    collapseMemberRow(member);
    await refreshMembers();
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to update role', {
      error: err,
      logContext: { action: 'update-member-role', feature: 'members' },
    });
  } finally {
    savingMemberRoleId.value = null;
  }
}

async function handleResendInvite(invite: WorkspaceInviteResponse): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  resendingInviteId.value = invite.id;

  try {
    await adminMembersClient.resendInvite(invite.id);
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
        await adminMembersClient.cancelInvite(invite.id);
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
          :empty-description="memberTableEmptyDescription"
          :expanded-rows="memberTableExpandedRows"
          :filters="memberTableFilters"
          :is-mobile-viewport="isMobileViewport"
          :last-active-filter-options="lastActiveFilterOptions"
          :loading="loading"
          :project-filter-options="projectFilterOptions"
          :role-filter-options="roleFilterOptions"
          :rows="memberTableRows"
          @edit-member="handleEditMember"
          @invite-member="inviteDialogVisible = true"
          @update:expanded-rows="setMemberTableExpandedRows"
          @update:filters="updateMemberTableFilters"
        >
          <template #row-expansion="{ row }">
            <div
              v-if="memberTableExpandedRows[row.id]"
              class="flex flex-col gap-3"
            >
              <MemberEditForm
                :can-remove="row.canManage"
                :member="row.member"
                :saving="savingMemberRoleId === row.id"
                @remove="handleRemoveMember(row.member)"
                @save="handleRoleSubmitted(row.member, $event)"
                @cancelled="collapseMemberRow(row.member)"
              />
              <MemberAssignPmPanel
                v-if="row.canAssignPm"
                :member="row.member"
                :projects="projects"
                :saving="savingMemberAssignmentId === row.id"
                @save="handleAssignmentsSubmitted(row.member, $event)"
                @cancelled="collapseMemberRow(row.member)"
              />
            </div>
          </template>
        </MembersTable>
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
