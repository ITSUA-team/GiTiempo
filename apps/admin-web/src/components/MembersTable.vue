<script setup lang="ts">
import {
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
} from '@heroicons/vue/24/outline';
import { ref } from 'vue';
import type {
  ProjectListResponse,
  WorkspaceMemberListResponse,
  WorkspaceMemberResponse,
} from '@gitiempo/shared';
import {
  EmptyStateBlock,
  ManagementTableRowAction,
  ManagementTableShell,
  formatWorkspaceRole,
  managementTableColumnPt,
} from '@gitiempo/web-shared';
import type { ManagementTableColumn } from '@gitiempo/web-shared';
import Avatar from 'primevue/avatar';
import Column from 'primevue/column';
import MemberAssignPmPanel from '@/components/forms/MemberAssignPmPanel.vue';
import MemberEditForm from '@/components/forms/MemberEditForm.vue';
import { useConfirmation } from '@/composables/useConfirmation';
import { adminMembersClient } from '@/services/admin-members-client';
import { useAuthStore } from '@/stores/auth';
import { useToasts } from '@/composables/useToasts';

const props = defineProps<{
  members: WorkspaceMemberListResponse;
  projects: ProjectListResponse;
  loading: boolean;
  currentUserId: string | null;
}>();

const emit = defineEmits<{
  'member-removed': [];
  'role-updated': [];
  'assignments-updated': [];
}>();

const authStore = useAuthStore();
const { successToast, errorToast } = useToasts();
const { requireConfirmation } = useConfirmation();

const expandedRows = ref<Record<string, boolean>>({});
const expansionMode = ref<Record<string, 'assign' | 'edit'>>({});

const columns: ManagementTableColumn[] = [
  { key: 'member', label: 'Member', width: 'fill' },
  { key: 'role', label: 'Role', width: 120 },
  { key: 'projects', label: 'Projects Assigned', width: 160 },
  { key: 'lastActive', label: 'Last Active', width: 140 },
  { key: 'actions', label: 'Actions', width: 200, align: 'end' },
];

function getInitials(member: WorkspaceMemberResponse): string {
  const source = member.displayName?.trim() || member.email;
  const parts = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase());

  return parts.join('') || '??';
}

function getProjectsAssignedCount(member: WorkspaceMemberResponse): number {
  return member.projectsAssignedCount;
}

function formatProjectsAssigned(member: WorkspaceMemberResponse): string {
  const count = getProjectsAssignedCount(member);
  return `${count} project${count === 1 ? '' : 's'}`;
}

const lastActiveFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatLastActive(lastActiveAt: string | null): string {
  if (!lastActiveAt) {
    return '—';
  }

  const parsed = new Date(lastActiveAt);

  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return lastActiveFormatter.format(parsed);
}

function isSelf(member: WorkspaceMemberResponse): boolean {
  return props.currentUserId !== null && member.userId === props.currentUserId;
}

function toggleExpansion(
  member: WorkspaceMemberResponse,
  mode: 'assign' | 'edit',
): void {
  if (
    expandedRows.value[member.id] &&
    expansionMode.value[member.id] === mode
  ) {
    const next = { ...expandedRows.value };
    delete next[member.id];
    expandedRows.value = next;
  } else {
    expansionMode.value = { ...expansionMode.value, [member.id]: mode };
    expandedRows.value = { [member.id]: true };
  }
}

function collapseRow(member: WorkspaceMemberResponse): void {
  const next = { ...expandedRows.value };
  delete next[member.id];
  expandedRows.value = next;
}

function handleAssignSaved(member: WorkspaceMemberResponse): void {
  collapseRow(member);
  emit('assignments-updated');
}

function handleEditSaved(member: WorkspaceMemberResponse): void {
  collapseRow(member);
  emit('role-updated');
}

function handleRemove(member: WorkspaceMemberResponse): void {
  requireConfirmation(
    `${member.displayName ?? member.email} will be removed from this workspace. This action cannot be undone.`,
    'Remove member?',
    'Remove',
    async () => {
      const token = authStore.accessToken;
      if (!token) return;

      try {
        await adminMembersClient.removeMember(token, member.id);
        successToast(`${member.displayName ?? member.email} has been removed.`);
        emit('member-removed');
      } catch (err) {
        errorToast(err instanceof Error ? err.message : 'Failed to remove member', {
          error: err,
          logContext: { action: 'remove-member', feature: 'members' },
        });
      }
    },
  );
}
</script>

<template>
  <div class="mb-4">
    <h2 class="text-text-dark text-lg font-semibold">
      Members Table
    </h2>
  </div>

  <div class="flex flex-col gap-3 sm:hidden">
    <template v-if="members.length > 0">
      <article
        v-for="member in members"
        :key="member.id"
        data-testid="member-mobile-card"
        class="border-divider bg-surface flex flex-col gap-3 rounded-lg border p-4"
      >
        <div class="flex items-start gap-3">
          <Avatar
            :image="member.avatarUrl ?? undefined"
            :label="!member.avatarUrl ? getInitials(member) : undefined"
            shape="circle"
            class="size-9 shrink-0"
            :pt="{
              root: 'bg-accent-tint text-brand text-[13px] font-semibold',
            }"
          />
          <div class="min-w-0 flex-1">
            <h3 class="text-text-dark truncate text-[15px] font-semibold">
              {{ member.displayName ?? member.email }}
            </h3>
            <p
              v-if="member.displayName"
              class="text-text-muted truncate text-[12px]"
            >
              {{ member.email }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-xs">Role</span>
            <span class="text-text-dark text-[13px] font-semibold">
              {{ formatWorkspaceRole(member.role) }}
            </span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-xs">Projects</span>
            <span class="text-text-dark text-[13px] font-semibold">
              {{ formatProjectsAssigned(member) }}
            </span>
          </div>
          <div class="col-span-2 flex flex-col gap-1">
            <span class="text-text-muted text-xs">Last active</span>
            <span class="text-text-dark text-[13px] font-semibold">
              {{ formatLastActive(member.lastActiveAt) }}
            </span>
          </div>
        </div>

        <div
          v-if="!isSelf(member)"
          class="border-divider flex justify-end gap-2 border-t pt-3"
        >
          <ManagementTableRowAction
            v-if="member.role !== 'admin'"
            :data-testid="`member-mobile-assign-pm-${member.id}`"
            :icon="UserPlusIcon"
            label="Assign PM"
            @click="toggleExpansion(member, 'assign')"
          />
          <ManagementTableRowAction
            :data-testid="`member-mobile-edit-${member.id}`"
            :icon="PencilSquareIcon"
            label="Edit"
            @click="toggleExpansion(member, 'edit')"
          />
          <ManagementTableRowAction
            :data-testid="`member-mobile-remove-${member.id}`"
            :icon="TrashIcon"
            label="Remove"
            tone="destructive"
            @click="handleRemove(member)"
          />
        </div>

        <MemberAssignPmPanel
          v-if="expansionMode[member.id] === 'assign' && expandedRows[member.id]"
          :member="member"
          :projects="projects"
          @saved="handleAssignSaved(member)"
          @cancelled="collapseRow(member)"
        />
        <MemberEditForm
          v-else-if="expansionMode[member.id] === 'edit' && expandedRows[member.id]"
          :member="member"
          @saved="handleEditSaved(member)"
          @cancelled="collapseRow(member)"
        />
      </article>
    </template>

    <EmptyStateBlock
      v-else-if="!loading"
      title="No members found"
      description="Invite members to get started."
    />
  </div>

  <ManagementTableShell
    v-model:expanded-rows="expandedRows"
    :columns="columns"
    :value="members"
    :loading="loading"
    data-key="id"
    class="hidden sm:block"
    header-class="border-divider bg-app-bg text-text-dark flex h-[44px] min-w-[880px] items-center border-b font-sans text-[13px] font-semibold"
    shell-class="border-divider overflow-x-auto rounded-[6px] border"
    table-class="min-w-[880px] w-full table-fixed border-collapse"
    table-container-class="overflow-visible rounded-none border-none"
  >
    <!-- Member: avatar + name + email -->
    <Column :pt="managementTableColumnPt">
      <template #body="{ data }">
        <div class="flex items-center gap-3">
          <Avatar
            :image="data.avatarUrl ?? undefined"
            :label="!data.avatarUrl ? getInitials(data) : undefined"
            shape="circle"
            class="size-8"
            :pt="{
              root: 'bg-accent-tint text-brand text-[13px] font-semibold',
            }"
          />
          <div class="flex flex-col">
            <span class="text-text-dark text-[14px] font-semibold">
              {{ data.displayName ?? data.email }}
            </span>
            <span
              v-if="data.displayName"
              class="text-text-muted text-[12px]"
            >{{ data.email }}</span>
          </div>
        </div>
      </template>
    </Column>

    <!-- Role -->
    <Column
      style="width: 120px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-[13px] font-bold text-black">{{
          formatWorkspaceRole(data.role)
        }}</span>
      </template>
    </Column>

    <!-- Projects Assigned -->
    <Column
      style="width: 160px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-muted text-[13px] font-normal">{{
          formatProjectsAssigned(data)
        }}</span>
      </template>
    </Column>

    <!-- Last Active -->
    <Column
      style="width: 140px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-muted text-[13px] font-normal">{{
          formatLastActive(data.lastActiveAt)
        }}</span>
      </template>
    </Column>

    <!-- Actions -->
    <Column
      style="width: 200px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <div class="flex items-center justify-end gap-2">
          <template v-if="!isSelf(data)">
            <ManagementTableRowAction
              v-if="data.role !== 'admin'"
              :data-testid="`member-assign-pm-${data.id}`"
              :icon="UserPlusIcon"
              label="Assign PM"
              @click="toggleExpansion(data, 'assign')"
            />
            <ManagementTableRowAction
              :data-testid="`member-edit-${data.id}`"
              :icon="PencilSquareIcon"
              label="Edit"
              @click="toggleExpansion(data, 'edit')"
            />
            <ManagementTableRowAction
              :data-testid="`member-remove-${data.id}`"
              :icon="TrashIcon"
              label="Remove"
              tone="destructive"
              @click="handleRemove(data)"
            />
          </template>
        </div>
      </template>
    </Column>

    <!-- Expansion: Assign PM panel or Edit form -->
    <template #expansion="{ data }">
      <MemberAssignPmPanel
        v-if="expansionMode[data.id] === 'assign'"
        :member="data"
        :projects="projects"
        @saved="handleAssignSaved(data)"
        @cancelled="collapseRow(data)"
      />
      <MemberEditForm
        v-else-if="expansionMode[data.id] === 'edit'"
        :member="data"
        @saved="handleEditSaved(data)"
        @cancelled="collapseRow(data)"
      />
    </template>

    <template #empty>
      <EmptyStateBlock
        title="No members found"
        description="Invite members to get started."
      />
    </template>
  </ManagementTableShell>
</template>
