<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import {
  StatCard,
  SurfaceCard,
  useIsMobileViewport,
} from '@gitiempo/web-shared';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import MemberEditForm from '@/components/forms/MemberEditForm.vue';
import MemberInviteDialog from '@/components/forms/MemberInviteDialog.vue';
import MembersTable from '@/components/MembersTable.vue';
import PendingInvitationsCard from '@/components/PendingInvitationsCard.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useConfirmation } from '@/composables/feedback/useConfirmation';
import { useToasts } from '@/composables/feedback/useToasts';
import { useMemberAssignmentActions } from '@/composables/members/useMemberAssignmentActions';
import { useMemberPermissionActions } from '@/composables/members/useMemberPermissionActions';
import { useMemberRoleActions } from '@/composables/members/useMemberRoleActions';
import { useMemberRemovalAction } from '@/composables/members/useMemberRemovalAction';
import { usePendingInviteActions } from '@/composables/members/usePendingInviteActions';
import { usePendingInvitesData } from '@/composables/members/usePendingInvitesData';
import { useWorkspaceMembersData } from '@/composables/members/useWorkspaceMembersData';
import { useMembersTableState } from '@/composables/useMembersTableState';
import { getAdminServerStateScope } from '@/lib/server-state-scope';
import { deriveMemberManagementStats, type MemberSettingsInput } from '@/lib/member-management';
import type { MembersTableRow } from '@/lib/members-table';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { dismissConfirmation, requireConfirmation } = useConfirmation();
const { errorToast, successToast } = useToasts();
const isMobileViewport = useIsMobileViewport();

const inviteDialogVisible = ref(false);

const accessToken = computed(() => authStore.accessToken);
const scope = computed(() => getAdminServerStateScope(accessToken.value));
const canManageMembers = computed(() => Boolean(
  accessToken.value && scope.value.workspaceId && scope.value.userId && scope.value.role === 'admin' &&
  authStore.profile?.role === 'admin' && authStore.profile.id === scope.value.userId,
));
const visit = ref(0);
const getVisit = () => visit.value;
onScopeDispose(() => {
  visit.value += 1;
  resetMembersData();
  resetInvitesData();
});
const currentUserId = computed(() => scope.value.userId ?? null);

function notifyMembersError(
  message: string,
  error: unknown,
  action: string,
): void {
  errorToast(message, {
    error,
    logContext: { action, feature: 'members' },
  });
}

const {
  applyAssignmentChanges,
  resetMembersData,
  initialLoaded,
  loadError,
  loading,
  loadMembersData,
  members,
  projects,
  refreshMembers,
  updateMember,
} = useWorkspaceMembersData({
  accessToken,
  onError: notifyMembersError,
});

const {
  resetInvitesData,
  invitesLoadError,
  invitesLoading,
  loadInvites,
  pendingInviteRows,
  refreshPendingInvites,
} = usePendingInvitesData({
  accessToken,
  onError: notifyMembersError,
});

const {
  collapseRow: collapseMemberRow,
  emptyDescription: memberTableEmptyDescription,
  expandedRows: memberTableExpandedRows,
  filters: memberTableFilters,
  lastActiveFilterOptions,
  pendingAssignmentEdit,
  retainAssignmentEdit,
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

const memberStats = computed(() =>
  deriveMemberManagementStats({
    invitesLoadError: invitesLoadError.value,
    members: members.value,
    pendingInviteRows: pendingInviteRows.value,
  }),
);

const { handleAssignmentsSubmitted } =
  useMemberAssignmentActions({
    accessToken,
    getVisit,
    onSaved(member, changes) {
      applyAssignmentChanges(member, changes);
      collapseMemberRow(member);
    },
    onError: notifyMembersError,
    projects,
    refreshMembers,
  });

const { saveRole } = useMemberRoleActions({
  getVisit,
  onError: notifyMembersError,
});
const { handleUpdateInvoicePermission, updatingPermissionMemberId } = useMemberPermissionActions({
  accessToken,
  getVisit,
  onError: notifyMembersError,
  onSaved: updateMember,
  refreshMembers,
});
const savingMemberSettingsId = ref<string | null>(null);
const pendingMemberEditId = computed(() => savingMemberSettingsId.value ?? updatingPermissionMemberId.value);

async function saveMemberSettings(row: MembersTableRow, input: MemberSettingsInput): Promise<void> {
  if (!canManageMembers.value || pendingMemberEditId.value !== null) return;

  const visitAtSubmit = getVisit();
  savingMemberSettingsId.value = row.id;
  try {
    let member = row.member;
    if (input.role && input.role !== member.role) {
      const updated = await saveRole(member, input.role);
      if (!updated || visitAtSubmit !== getVisit()) return;
      member = updated;
      updateMember(updated);
    }

    if (input.projectIds && row.canAssignPm && member.role !== 'admin') {
      retainAssignmentEdit(member, input.projectIds);
      await handleAssignmentsSubmitted({ ...row, member }, { projectIds: input.projectIds });
    } else {
      collapseMemberRow(member);
    }
  } finally {
    if (visitAtSubmit === getVisit()) savingMemberSettingsId.value = null;
  }
}

const { handleRemoveMember } = useMemberRemovalAction({
  accessToken,
  getVisit,
  onError: notifyMembersError,
  refreshMembers,
  requireConfirmation,
});

const {
  cancelingInviteId,
  handleCancelInvite,
  handleInviteCreated,
  handleResendInvite,
  resendingInviteId,
} = usePendingInviteActions({
  accessToken,
  getVisit,
  onError: notifyMembersError,
  onSuccess: successToast,
  refreshPendingInvites,
  requireConfirmation,
});

async function fetchAll(): Promise<void> {
  await Promise.all([
    loadMembersData({
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

// A save can start before Vue propagates the disabled prop to the table.
function whenMemberEditorIdle<T>(action: (value: T) => void) {
  return (value: T) => {
    if (pendingMemberEditId.value === null) action(value);
  };
}

const handleEditMember = whenMemberEditorIdle(toggleMemberExpansion);
const handleExpandedRows = whenMemberEditorIdle(setMemberTableExpandedRows);
const handleTableFilters = whenMemberEditorIdle(updateMemberTableFilters);

watch(
  [
    () => scope.value.workspaceId,
    () => scope.value.userId,
    () => scope.value.role,
    canManageMembers,
  ],
  () => {
    visit.value += 1;
    resetMembersData();
    resetInvitesData();
    inviteDialogVisible.value = false;
    memberTableExpandedRows.value = {};
    updateMemberTableFilters({
      global: '',
      memberQuery: '',
      projectIds: [],
      role: null,
      lastActive: 'any',
    });
    updatingPermissionMemberId.value = null;
    savingMemberSettingsId.value = null;
    cancelingInviteId.value = null;
    resendingInviteId.value = null;
    dismissConfirmation?.();
    if (canManageMembers.value) {
      void fetchAll();
    }
  },
  { immediate: true, flush: 'sync' },
);
</script>

<template>
  <div
    v-if="canManageMembers"
    class="flex flex-col gap-6"
  >
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
          :value="memberStats.activeMembers"
        />
        <StatCard
          label="Pending Invites"
          :value="memberStats.pendingInvites"
        />
        <StatCard
          label="PMs Assigned"
          :value="memberStats.pmsAssigned"
        />
      </div>

      <SurfaceCard
        padding-class="p-6"
      >
        <MembersTable
          :empty-description="memberTableEmptyDescription"
          :expanded-rows="memberTableExpandedRows"
          :filters="memberTableFilters"
          :is-mobile-viewport="isMobileViewport"
          :last-active-filter-options="lastActiveFilterOptions"
          :loading="loading"
          :member-editing-disabled="pendingMemberEditId !== null"
          :project-filter-options="projectFilterOptions"
          :role-filter-options="roleFilterOptions"
          :rows="memberTableRows"
          @edit-member="handleEditMember"
          @invite-member="canManageMembers && (inviteDialogVisible = true)"
          @update:expanded-rows="handleExpandedRows"
          @update:filters="handleTableFilters"
        >
          <template #row-expansion="{ row }">
            <div
              v-if="memberTableExpandedRows[row.id]"
              class="flex flex-col gap-3"
            >
              <MemberEditForm
                :can-assign-pm="row.canAssignPm"
                :can-remove="row.canManage"
                :member="row.member"
                :initial-project-ids="pendingAssignmentEdit && pendingAssignmentEdit.memberId === row.id ? pendingAssignmentEdit.projectIds : undefined"
                :projects="projects"
                :saving="pendingMemberEditId === row.id"
                @remove="row.canManage && handleRemoveMember(row.member)"
                @save="saveMemberSettings(row, $event)"
                @update:can-view-invoices="pendingMemberEditId === null && handleUpdateInvoicePermission(row, $event)"
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
      :key="visit"
      v-model:visible="inviteDialogVisible"
      @created="handleInviteCreated"
    />
  </div>
</template>
