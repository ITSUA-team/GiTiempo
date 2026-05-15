<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type {
  ProjectListResponse,
  WorkspaceInviteListResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { SectionHeader, StatCard, SurfaceCard } from '@gitiempo/web-shared';
import Button from 'primevue/button';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import MemberInviteDialog from '@/components/forms/MemberInviteDialog.vue';
import MembersTable from '@/components/MembersTable.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useToasts } from '@/composables/useToasts';
import { adminMembersClient } from '@/services/admin-members-client';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { errorToast } = useToasts();

const members = ref<WorkspaceMemberListResponse>([]);
const invites = ref<WorkspaceInviteListResponse>([]);
const projects = ref<ProjectListResponse>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);
const initialLoaded = ref(false);
const inviteDialogVisible = ref(false);

interface LoadDataOptions {
  errorAction: string;
  setError?: boolean;
  setInitialLoaded?: boolean;
}

const currentUserId = computed(() => authStore.profile?.id ?? null);

const activeMembers = computed(() => members.value.length);
const pendingInvites = computed(
  () => invites.value.filter((i) => i.status === 'pending').length,
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
    const [membersData, invitesData, projectsData] = await Promise.all([
      adminMembersClient.listMembers(token),
      adminMembersClient.listInvites(token),
      adminProjectsClient.listProjects(token),
    ]);

    members.value = membersData;
    invites.value = invitesData;
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

async function fetchAll(): Promise<void> {
  await loadData({
    errorAction: 'load-members',
    setError: true,
    setInitialLoaded: true,
  });
}

async function refresh(): Promise<void> {
  await loadData({ errorAction: 'refresh-members' });
}

function handleInviteCreated(): void {
  refresh();
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
        variant="stats"
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
      </SectionHeader>

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
