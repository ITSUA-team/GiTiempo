<script setup lang="ts">
  import { computed, onMounted, ref, shallowRef } from 'vue';
  import { useRouter } from 'vue-router';
  import { useToast } from 'primevue/usetoast';
  import Button from 'primevue/button';
  import ProgressSpinner from 'primevue/progressspinner';
  import { useAuthStore } from '@/stores/auth';
  import {
    createProjectsClient,
    createMembersClient,
    type ProjectsClient,
    type MembersClient,
  } from '@gitiempo/web-shared';
  import type { WorkspaceMemberResponse } from '@gitiempo/shared';
  import { routeNames } from '@/router';
  import ProjectStatsCards from '@/components/projects/ProjectStatsCards.vue';
  import ProjectsTable, {
    type ProjectWithAssignments,
  } from '@/components/projects/ProjectsTable.vue';
  import AdminPageHeader from '@/components/layout/AdminPageHeader.vue';

  const toast = useToast();
  const router = useRouter();
  const authStore = useAuthStore();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const projectsClient: ProjectsClient = createProjectsClient({ apiBaseUrl });
  const membersClient: MembersClient = createMembersClient({ apiBaseUrl });

  // State
  const projects = shallowRef<ProjectWithAssignments[]>([]);
  const members = shallowRef<WorkspaceMemberResponse[]>([]);
  const loading = ref(true);
  const selectedMemberFilter = ref<string | null>(null);
  const savingProjectId = ref<string | null>(null);

  // Only pm/member roles can be assigned — admins have implicit access
  const assignableMembers = computed(() =>
    members.value
      .filter((m) => m.role !== 'admin')
      .map((m) => ({ ...m, label: m.displayName ?? m.email })),
  );

  // Stats — design shows only active projects count
  const activeProjects = computed(
    () => projects.value.filter((p) => p.isActive).length,
  );
  const privateProjects = computed(
    () =>
      projects.value.filter((p) => p.isActive && p.visibility === 'private')
        .length,
  );
  const publicProjects = computed(
    () =>
      projects.value.filter((p) => p.isActive && p.visibility === 'public')
        .length,
  );

  // Table shows all projects; archived shown with muted styling
  const filteredProjects = computed(() => {
    if (!selectedMemberFilter.value) return projects.value;
    return projects.value.filter((p) =>
      p.assignedMembers.some((m) => m.userId === selectedMemberFilter.value),
    );
  });

  const memberFilterOptions = computed(() => [
    { id: null, label: 'All members' },
    ...members.value.map((m) => ({
      id: m.userId,
      label: m.displayName ? `${m.displayName} (${m.role})` : m.email,
    })),
  ]);

  async function loadData() {
    if (!authStore.accessToken) return;
    const accessToken = authStore.accessToken;
    try {
      loading.value = true;
      const [projectsData, membersData] = await Promise.all([
        projectsClient.listProjects(accessToken),
        membersClient.listMembers(accessToken),
      ]);

      const projectsWithAssignments = await Promise.all(
        projectsData.map(async (project) => {
          try {
            const assignments = await projectsClient.listProjectAssignments(
              project.id,
              accessToken,
            );
            return {
              ...project,
              assignedMembers: assignments,
            } as ProjectWithAssignments;
          } catch {
            return {
              ...project,
              assignedMembers: [],
            } as ProjectWithAssignments;
          }
        }),
      );

      projects.value = projectsWithAssignments;
      members.value = membersData;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error instanceof Error ? error.message : 'Failed to load data',
      });
    } finally {
      loading.value = false;
    }
  }

  function openCreateProject() {
    router.push({ name: routeNames.addProject });
  }

  async function handleSave(
    project: ProjectWithAssignments,
    newMembers: string[],
    newVisibility: 'public' | 'private',
  ) {
    if (!authStore.accessToken) return;
    const accessToken = authStore.accessToken;
    savingProjectId.value = project.id;
    try {
      if (newVisibility !== project.visibility) {
        await projectsClient.updateProject(
          project.id,
          { visibility: newVisibility },
          accessToken,
        );
      }

      const currentIds = new Set(project.assignedMembers.map((m) => m.userId));
      const newIds = new Set(newMembers);
      const toAdd = newMembers.filter((id) => !currentIds.has(id));
      const toRemove = project.assignedMembers
        .filter((m) => !newIds.has(m.userId))
        .map((m) => m.userId);

      await Promise.all([
        ...toAdd.map((userId) =>
          projectsClient.assignUserToProject(
            project.id,
            { userId },
            accessToken,
          ),
        ),
        ...toRemove.map((userId) =>
          projectsClient.removeProjectAssignment(
            project.id,
            userId,
            accessToken,
          ),
        ),
      ]);

      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Project settings updated',
        life: 3000,
      });
      await loadData();
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail:
          error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      savingProjectId.value = null;
    }
  }

  async function handleArchive(project: ProjectWithAssignments) {
    if (!authStore.accessToken) return;
    const accessToken = authStore.accessToken;
    try {
      await projectsClient.updateProject(
        project.id,
        { isActive: false },
        accessToken,
      );
      toast.add({
        severity: 'success',
        summary: 'Archived',
        detail: `Project "${project.name}" archived`,
        life: 3000,
      });
      await loadData();
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail:
          error instanceof Error ? error.message : 'Failed to archive project',
      });
    }
  }

  async function handleUnarchive(project: ProjectWithAssignments) {
    if (!authStore.accessToken) return;
    const accessToken = authStore.accessToken;
    try {
      await projectsClient.updateProject(
        project.id,
        { isActive: true },
        accessToken,
      );
      toast.add({
        severity: 'success',
        summary: 'Restored',
        detail: `Project "${project.name}" restored`,
        life: 3000,
      });
      await loadData();
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail:
          error instanceof Error ? error.message : 'Failed to restore project',
      });
    }
  }

  onMounted(() => loadData());
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Page Header -->
    <AdminPageHeader
      title="Projects"
      subtitle="Manage project visibility, member assignments, and manual project creation."
    >
      <Button
        label="New Project"
        class="!px-4 !py-[10px] !text-[14px] !font-semibold"
        @click="openCreateProject"
      />
    </AdminPageHeader>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <ProgressSpinner stroke-width="3" style="width: 40px; height: 40px" />
    </div>

    <template v-else>
      <ProjectStatsCards
        :active-projects="activeProjects"
        :private-projects="privateProjects"
        :public-projects="publicProjects"
      />

      <ProjectsTable
        v-model:member-filter="selectedMemberFilter"
        :projects="filteredProjects"
        :assignable-members="assignableMembers"
        :member-filter-options="memberFilterOptions"
        :saving-project-id="savingProjectId"
        @save="handleSave"
        @archive="handleArchive"
        @unarchive="handleUnarchive"
      />
    </template>
  </div>
</template>
