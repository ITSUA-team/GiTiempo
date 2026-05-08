<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type {
  ProjectListResponse,
  WorkspaceInviteListResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { StatCard, StatsHeader, SurfaceCard } from '@gitiempo/web-shared';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import { useToast } from 'primevue/usetoast';

import MemberInviteDialog from '@/components/MemberInviteDialog.vue';
import MembersTable from '@/components/MembersTable.vue';
import { adminMembersClient } from '@/services/admin-members-client';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const toast = useToast();

const members = ref<WorkspaceMemberListResponse>([]);
const invites = ref<WorkspaceInviteListResponse>([]);
const projects = ref<ProjectListResponse>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);
const inviteDialogVisible = ref(false);

const currentUserId = computed(() => authStore.profile?.id ?? null);

const activeMembers = computed(() => members.value.length);
const pendingInvites = computed(
  () => invites.value.filter((i) => i.status === 'pending').length,
);
const pmsAssigned = computed(
  () => members.value.filter((m) => m.role === 'pm').length,
);

async function fetchAll(): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  loading.value = true;
  loadError.value = null;

  try {
    const [membersData, invitesData, projectsData] = await Promise.all([
      adminMembersClient.listMembers(token),
      adminMembersClient.listInvites(token),
      adminProjectsClient.listProjects(token),
    ]);

    members.value = membersData;
    invites.value = invitesData;
    projects.value = projectsData;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    loadError.value = message;
    toast.add({
      severity: 'error',
      summary: 'Failed to load members',
      detail: message,
      life: 5000,
    });
  } finally {
    loading.value = false;
  }
}

async function refresh(): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  loading.value = true;

  try {
    const [membersData, invitesData, projectsData] = await Promise.all([
      adminMembersClient.listMembers(token),
      adminMembersClient.listInvites(token),
      adminProjectsClient.listProjects(token),
    ]);

    members.value = membersData;
    invites.value = invitesData;
    projects.value = projectsData;
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Failed to refresh members',
      detail: err instanceof Error ? err.message : 'An unexpected error occurred',
      life: 5000,
    });
  } finally {
    loading.value = false;
  }
}

function handleInviteCreated(): void {
  refresh();
}

onMounted(fetchAll);
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <ConfirmDialog />

    <!-- Error state -->
    <template v-if="loadError && !loading">
      <SurfaceCard padding-class="p-6">
        <div class="flex flex-col items-center gap-3 py-6 text-center">
          <span class="text-text-dark text-[15px] font-semibold">Failed to load members</span>
          <span class="text-text-muted text-[13px]">{{ loadError }}</span>
          <Button
            label="Try again"
            severity="secondary"
            outlined
            @click="fetchAll"
          />
        </div>
      </SurfaceCard>
    </template>

    <!-- Main content -->
    <template v-else>
      <StatsHeader
        title="Members"
        description="Manage team roles, project assignments, and member activity."
      >
        <template #actions>
          <Button
            label="Invite Member"
            @click="inviteDialogVisible = true"
          />
        </template>
        <template #stats>
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
        </template>
      </StatsHeader>

      <SurfaceCard padding-class="p-5">
        <MembersTable
          :members="members"
          :projects="projects"
          :loading="loading"
          :current-user-id="currentUserId"
          @member-removed="refresh"
          @role-updated="refresh"
          @assignments-updated="refresh"
        />
      </SurfaceCard>
    </template>

    <MemberInviteDialog
      v-model:visible="inviteDialogVisible"
      @created="handleInviteCreated"
    />
  </div>
</template>
