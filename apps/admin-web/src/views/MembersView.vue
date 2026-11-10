<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import type { WorkspaceMemberResponse } from '@gitiempo/shared';
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
import { useMemberRemovalAction } from '@/composables/members/useMemberRemovalAction';
import { usePendingInviteActions } from '@/composables/members/usePendingInviteActions';
import { usePendingInvitesData } from '@/composables/members/usePendingInvitesData';
import { useWorkspaceMembersData } from '@/composables/members/useWorkspaceMembersData';
import { useMembersTableState } from '@/composables/useMembersTableState';
import { getAdminServerStateScope } from '@/lib/server-state-scope';
import { deriveMemberManagementStats } from '@/lib/member-management';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { dismissConfirmation, requireConfirmation } = useConfirmation();
const { errorToast, successToast } = useToasts();
const isMobileViewport = useIsMobileViewport();

const inviteDialogVisible = ref(false);

const accessToken = computed(() => authStore.accessToken);
const scope = computed(() => getAdminServerStateScope(accessToken.value));
const canManageMembers = computed(() => Boolean(
  accessToken.value && scope.value.workspaceId && scope.value.userId && scope.value.role === 'admin',
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
  resetMembersData,
  initialLoaded,
  loadError,
  loading,
  loadMembersData,
  members,
  projects,
  refreshMembers,
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

const { handleAssignmentsSubmitted, savingMemberAssignmentId } =
  useMemberAssignmentActions({
    accessToken,
    getVisit,
    collapseMemberRow,
    onError: notifyMembersError,
    projects,
    refreshMembers,
  });

const { handleUpdateInvoicePermission } = useMemberPermissionActions({
  accessToken,
  getVisit,
  onError: notifyMembersError,
  refreshMembers,
});

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

function handleEditMember(member: WorkspaceMemberResponse): void {
  toggleMemberExpansion(member);
}

watch(
  [
    () => scope.value.workspaceId,
    () => scope.value.userId,
    () => scope.value.role,
    () => Boolean(accessToken.value),
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
    savingMemberAssignmentId.value = null;
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
        v-if="canManageMembers"
        padding-class="p-6"
      >
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
          @invite-member="canManageMembers && (inviteDialogVisible = true)"
          @update:expanded-rows="setMemberTableExpandedRows"
          @update:filters="updateMemberTableFilters"
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
                :projects="projects"
                :saving="savingMemberAssignmentId === row.id"
                @remove="handleRemoveMember(row.member)"
                @save="handleAssignmentsSubmitted(row, $event)"
                @update:can-view-invoices="handleUpdateInvoicePermission(row, $event)"
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
      v-if="canManageMembers"
      :key="visit"
      v-model:visible="inviteDialogVisible"
      @created="handleInviteCreated"
    />
  </div>
</template>
