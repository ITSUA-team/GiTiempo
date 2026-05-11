<script setup lang="ts">
import { ref } from 'vue';
import type {
  ProjectListResponse,
  WorkspaceMemberListResponse,
  WorkspaceMemberResponse,
} from '@gitiempo/shared';
import {
  ManagementTableShell,
  formatWorkspaceRole,
} from '@gitiempo/web-shared';
import type { ManagementTableColumn } from '@gitiempo/web-shared';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
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

const actionBtnBase = 'px-1.5 py-1 text-[13px] font-semibold leading-none rounded bg-transparent border-none shadow-none no-underline';
const actionBtnPt = {
  brand: { root: { class: `${actionBtnBase} text-brand` } },
  destructive: { root: { class: `${actionBtnBase} text-destructive` } },
  muted: { root: { class: `${actionBtnBase} text-text-muted` } },
} as const;

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
  return props.projects.filter(
    (p) => p.isActive && p.members.some((m) => m.userId === member.userId),
  ).length;
}

function formatProjectsAssigned(member: WorkspaceMemberResponse): string {
  const count = getProjectsAssignedCount(member);
  return `${count} project${count === 1 ? '' : 's'}`;
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
        errorToast(err instanceof Error ? err.message : 'Failed to remove member');
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

  <ManagementTableShell :columns="columns">
    <DataTable
      v-model:expanded-rows="expandedRows"
      :value="members"
      :loading="loading"
      :show-headers="false"
      data-key="id"
      class="gt-management-table"
      :pt="{
        rowExpansion: { style: 'height: auto;' },
      }"
    >
      <!-- Member: avatar + name + email -->
      <Column>
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
      <Column style="width: 120px">
        <template #body="{ data }">
          <span class="text-[13px] font-bold text-black">{{
            formatWorkspaceRole(data.role)
          }}</span>
        </template>
      </Column>

      <!-- Projects Assigned (computed client-side) -->
      <Column style="width: 160px">
        <template #body="{ data }">
          <span class="text-text-muted text-[13px] font-normal">{{
            formatProjectsAssigned(data)
          }}</span>
        </template>
      </Column>

      <!-- Last Active (not available from API yet — show dash) -->
      <Column style="width: 140px">
        <template #body>
          <span class="text-text-muted text-[13px] font-normal">&mdash;</span>
        </template>
      </Column>

      <!-- Actions -->
      <Column style="width: 200px">
        <template #body="{ data }">
          <div class="flex items-center justify-end gap-2">
            <template v-if="!isSelf(data)">
              <Button
                v-if="data.role !== 'admin'"
                label="Assign PM"
                variant="link"
                :pt="actionBtnPt.brand"
                @click="toggleExpansion(data, 'assign')"
              />
              <Button
                label="Edit"
                variant="link"
                :pt="actionBtnPt.brand"
                @click="toggleExpansion(data, 'edit')"
              />
              <Button
                label="Remove"
                variant="link"
                :pt="actionBtnPt.destructive"
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
        <div class="flex flex-col items-center gap-2 py-10">
          <span class="text-text-dark text-[14px] font-semibold">No members found</span>
          <span class="text-text-muted text-[13px]">
            Invite members to get started.
          </span>
        </div>
      </template>
    </DataTable>
  </ManagementTableShell>
</template>
