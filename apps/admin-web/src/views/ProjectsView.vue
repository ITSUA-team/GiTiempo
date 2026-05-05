<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, shallowRef } from 'vue';
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
    PageHeader,
    type StatCard,
  } from '@gitiempo/web-shared';
  import type {
    WorkspaceMemberResponse,
    ProjectAssignmentResponse,
  } from '@gitiempo/shared';
  import { routeNames } from '@/router';
  import ProjectsTable, {
    type ProjectWithAssignments,
  } from '@/components/projects/ProjectsTable.vue';

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
  const closedProjectId = ref<string | null>(null);
  const lastEditedProjectId = ref<string | null>(null);
  const loadingEditProjectId = ref<string | null>(null);
  const editProjectAssignments = ref<
    Record<string, ProjectAssignmentResponse[]>
  >({});

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

  const statsCards = computed<StatCard[]>(() => [
    { label: 'Active Projects', value: activeProjects.value },
    { label: 'Private', value: privateProjects.value },
    { label: 'Public', value: publicProjects.value },
  ]);

  // Table shows all projects; active first, archived at the bottom.
  // Within the active group the last-edited project is pinned to the top.
  const filteredProjects = computed(() => {
    const list = selectedMemberFilter.value
      ? projects.value.filter((p) =>
          p.assignedMembers.some(
            (m) => m.userId === selectedMemberFilter.value,
          ),
        )
      : projects.value;
    const pinned = lastEditedProjectId.value;
    return [...list].sort((a, b) => {
      if (a.isActive !== b.isActive)
        return Number(b.isActive) - Number(a.isActive);
      if (pinned) {
        if (a.id === pinned) return -1;
        if (b.id === pinned) return 1;
      }
      return 0;
    });
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
      projects.value = projectsData.map((p) => ({
        ...p,
        assignedMembers: editProjectAssignments.value[p.id] ?? [],
      }));
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

  async function refreshData() {
    if (!authStore.accessToken) return;
    const accessToken = authStore.accessToken;
    try {
      const [projectsData, membersData] = await Promise.all([
        projectsClient.listProjects(accessToken),
        membersClient.listMembers(accessToken),
      ]);
      projects.value = projectsData.map((p) => ({
        ...p,
        assignedMembers: editProjectAssignments.value[p.id] ?? [],
      }));
      members.value = membersData;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error instanceof Error ? error.message : 'Failed to load data',
      });
    }
  }

  function openCreateProject() {
    router.push({ name: routeNames.addProject });
  }

  async function handleOpenEdit(projectId: string) {
    if (!authStore.accessToken) return;
    // Already cached — no fetch needed
    if (editProjectAssignments.value[projectId]) return;
    loadingEditProjectId.value = projectId;
    try {
      const assignments = await projectsClient.listProjectAssignments(
        projectId,
        authStore.accessToken,
      );
      editProjectAssignments.value = {
        ...editProjectAssignments.value,
        [projectId]: assignments,
      };
      // Patch the project row so the table sees the assignments immediately
      projects.value = projects.value.map((p) =>
        p.id === projectId ? { ...p, assignedMembers: assignments } : p,
      );
    } catch {
      // Non-fatal — edit panel still opens with empty members
    } finally {
      loadingEditProjectId.value = null;
    }
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

      // Use the live cache as the diff baseline — project.assignedMembers is
      // the object at the time the user clicked Save and may be stale if the
      // panel was open across a previous save.
      const cachedAssignments =
        editProjectAssignments.value[project.id] ?? project.assignedMembers;
      const currentIds = new Set(cachedAssignments.map((m) => m.userId));
      const newIds = new Set(newMembers);
      const toAdd = newMembers.filter((id) => !currentIds.has(id));
      const toRemove = cachedAssignments
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

      // Optimistically update the cache with the intended new state so any
      // further save before the re-fetch completes diffs against truth.
      const optimisticAssignments = cachedAssignments.filter((m) =>
        newIds.has(m.userId),
      );
      editProjectAssignments.value = {
        ...editProjectAssignments.value,
        [project.id]: optimisticAssignments,
      };
      projects.value = projects.value.map((p) =>
        p.id === project.id
          ? { ...p, assignedMembers: optimisticAssignments }
          : p,
      );

      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Project settings updated',
        life: 3000,
      });
      closedProjectId.value = project.id;
      lastEditedProjectId.value = project.id;

      // Re-fetch the fresh assignment list and update the cache so refreshData
      // maps the correct assignedMembers onto the row immediately.
      try {
        const freshAssignments = await projectsClient.listProjectAssignments(
          project.id,
          accessToken,
        );
        editProjectAssignments.value = {
          ...editProjectAssignments.value,
          [project.id]: freshAssignments,
        };
      } catch {
        // Non-fatal: clear the cache entry so the next edit re-fetches
        editProjectAssignments.value = Object.fromEntries(
          Object.entries(editProjectAssignments.value).filter(
            ([k]) => k !== project.id,
          ),
        );
      }

      await nextTick();
      closedProjectId.value = null;
      await refreshData();
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
      await refreshData();
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
      await refreshData();
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
    <PageHeader
      title="Projects"
      subtitle="Manage project visibility, member assignments, and manual project creation."
      :cards="loading ? undefined : statsCards"
    >
      <Button
        label="New Project"
        class="!px-4 !py-[10px] !text-[14px] !font-semibold"
        @click="openCreateProject"
      />
    </PageHeader>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <ProgressSpinner stroke-width="3" style="width: 40px; height: 40px" />
    </div>

    <template v-else>
      <ProjectsTable
        v-model:member-filter="selectedMemberFilter"
        :projects="filteredProjects"
        :assignable-members="assignableMembers"
        :member-filter-options="memberFilterOptions"
        :saving-project-id="savingProjectId"
        :closed-project-id="closedProjectId"
        :loading-edit-project-id="loadingEditProjectId"
        @open-edit="handleOpenEdit"
        @save="handleSave"
        @archive="handleArchive"
        @unarchive="handleUnarchive"
      />
    </template>
  </div>
</template>
