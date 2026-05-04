<script setup lang="ts">
  import { computed, onMounted, ref, shallowRef } from 'vue';
  import { useRouter } from 'vue-router';
  import { useToast } from 'primevue/usetoast';
  import Button from 'primevue/button';
  import Select from 'primevue/select';
  import MultiSelect from 'primevue/multiselect';
  import ProgressSpinner from 'primevue/progressspinner';
  import { AppFormField } from '@gitiempo/web-shared';
  import { useAuthStore } from '@/stores/auth';
  import {
    createProjectsClient,
    createMembersClient,
    type ProjectsClient,
    type MembersClient,
  } from '@gitiempo/web-shared';
  import type {
    ProjectResponse,
    WorkspaceMemberResponse,
    ProjectAssignmentResponse,
  } from '@gitiempo/shared';
  import { routeNames } from '@/router';

  const toast = useToast();
  const router = useRouter();
  const authStore = useAuthStore();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const projectsClient: ProjectsClient = createProjectsClient({ apiBaseUrl });
  const membersClient: MembersClient = createMembersClient({ apiBaseUrl });

  interface ProjectWithAssignments extends ProjectResponse {
    assignedMembers: ProjectAssignmentResponse[];
  }

  // State
  const projects = shallowRef<ProjectWithAssignments[]>([]);
  const members = shallowRef<WorkspaceMemberResponse[]>([]);
  const loading = ref(true);
  const selectedMemberFilter = ref<string | null>(null);

  // Inline edit state
  const expandedProjectId = ref<string | null>(null);
  const editingMembers = ref<string[]>([]);
  const editingVisibility = ref<'public' | 'private'>('private');
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

  function openSettings(project: ProjectWithAssignments) {
    if (expandedProjectId.value === project.id) {
      expandedProjectId.value = null;
      return;
    }
    expandedProjectId.value = project.id;
    editingMembers.value = project.assignedMembers.map((m) => m.userId);
    editingVisibility.value = project.visibility;
  }

  function cancelSettings() {
    expandedProjectId.value = null;
  }

  async function saveSettings(project: ProjectWithAssignments) {
    if (!authStore.accessToken) return;
    const accessToken = authStore.accessToken;
    savingProjectId.value = project.id;
    try {
      if (editingVisibility.value !== project.visibility) {
        await projectsClient.updateProject(
          project.id,
          { visibility: editingVisibility.value },
          accessToken,
        );
      }

      const currentIds = new Set(project.assignedMembers.map((m) => m.userId));
      const newIds = new Set(editingMembers.value);
      const toAdd = editingMembers.value.filter((id) => !currentIds.has(id));
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
      expandedProjectId.value = null;
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

  async function archiveProject(project: ProjectWithAssignments) {
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
      expandedProjectId.value = null;
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

  async function unarchiveProject(project: ProjectWithAssignments) {
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
      expandedProjectId.value = null;
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
  function formatHours(hours: number): string {
    if (hours === 0) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours % 1) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function formatSource(source: string): string {
    return source === 'github' ? 'GitHub Repo' : 'Manual';
  }

  function formatMembersCount(
    assignments: ProjectAssignmentResponse[],
  ): string {
    if (!assignments.length) return '—';
    return `${assignments.length} member${assignments.length !== 1 ? 's' : ''}`;
  }

  onMounted(() => loadData());
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1.5">
        <h1 class="text-text-dark text-[28px] font-semibold leading-none">
          Projects
        </h1>
        <p class="text-text-muted text-sm">
          Manage project visibility, member assignments, and manual project
          creation.
        </p>
      </div>
      <Button
        label="New Project"
        class="!px-4 !py-[10px] !text-[14px] !font-semibold"
        @click="openCreateProject"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <ProgressSpinner stroke-width="3" style="width: 40px; height: 40px" />
    </div>

    <template v-else>
      <!-- 3 Stat Cards -->
      <div class="grid grid-cols-3 gap-4">
        <div
          class="bg-surface shadow-card flex h-24 flex-col gap-2 rounded-lg p-4"
        >
          <span class="text-text-muted text-[13px] font-medium">
            Active Projects
          </span>
          <span class="text-text-dark text-[28px] font-semibold leading-none">
            {{ activeProjects }}
          </span>
        </div>
        <div
          class="bg-surface shadow-card flex h-24 flex-col gap-2 rounded-lg p-4"
        >
          <span class="text-text-muted text-[13px] font-medium">Private</span>
          <span class="text-text-dark text-[28px] font-semibold leading-none">
            {{ privateProjects }}
          </span>
        </div>
        <div
          class="bg-surface shadow-card flex h-24 flex-col gap-2 rounded-lg p-4"
        >
          <span class="text-text-muted text-[13px] font-medium">Public</span>
          <span class="text-text-dark text-[28px] font-semibold leading-none">
            {{ publicProjects }}
          </span>
        </div>
      </div>

      <!-- Projects Card -->
      <div class="bg-surface shadow-card flex flex-col gap-4 rounded-lg p-5">
        <!-- Card Header: title left, checkbox + filter right -->
        <div class="flex items-end justify-between">
          <h2 class="text-text-dark text-lg font-semibold">Projects Table</h2>
          <div class="flex items-end gap-4">
            <div class="flex flex-col gap-1.5">
              <span class="text-text-muted text-xs font-medium">
                Assigned member
              </span>
              <Select
                v-model="selectedMemberFilter"
                :options="memberFilterOptions"
                option-label="label"
                option-value="id"
                placeholder="All members"
                class="w-[260px]"
              />
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="border-divider overflow-hidden rounded-sm border">
          <!-- Header Row — bg-app-bg, h-44px -->
          <div class="bg-app-bg flex h-11 w-full items-center">
            <div class="min-w-0 flex-1 px-3">
              <span class="text-text-dark text-[13px] font-semibold">
                Project
              </span>
            </div>
            <div class="min-w-[100px] shrink px-3">
              <span class="text-text-dark text-[13px] font-semibold">
                Source
              </span>
            </div>
            <div class="min-w-[120px] shrink px-3">
              <span class="text-text-dark text-[13px] font-semibold">
                Assigned members
              </span>
            </div>
            <div class="min-w-[80px] shrink px-3">
              <span class="text-text-dark text-[13px] font-semibold">
                Hours
              </span>
            </div>
            <div class="min-w-[90px] shrink px-3">
              <span class="text-text-dark text-[13px] font-semibold">
                Visibility
              </span>
            </div>
            <div class="min-w-[130px] shrink px-3 text-right">
              <span class="text-text-dark text-[13px] font-semibold">
                Actions
              </span>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="!filteredProjects.length"
            class="border-divider text-text-muted flex items-center justify-center border-t py-10 text-sm"
          >
            No projects found.
          </div>

          <!-- Project Rows -->
          <template
            v-for="(project, index) in filteredProjects"
            :key="project.id"
          >
            <!-- Data Row — h-56px, border-top on all but first -->
            <div
              class="flex h-14 w-full items-center"
              :class="{ 'border-divider border-t': index > 0 }"
            >
              <!-- Project name + Archived badge -->
              <div class="flex min-w-0 flex-1 items-center gap-2 px-3">
                <span
                  class="truncate text-sm font-semibold"
                  :class="
                    project.isActive ? 'text-text-dark' : 'text-text-muted'
                  "
                >
                  {{ project.name }}
                </span>
                <span
                  v-if="!project.isActive"
                  class="bg-app-bg text-text-muted shrink-0 rounded-sm px-2 py-[4px] text-xs font-semibold"
                >
                  Archived
                </span>
              </div>

              <!-- Source -->
              <div class="min-w-[100px] shrink px-3">
                <span
                  class="truncate text-[13px]"
                  :class="
                    project.isActive
                      ? 'text-text-muted'
                      : 'text-text-muted opacity-50'
                  "
                >
                  {{ formatSource(project.source) }}
                </span>
              </div>

              <!-- Assigned members count -->
              <div class="min-w-[120px] shrink px-3">
                <span
                  class="truncate text-[13px]"
                  :class="
                    project.isActive
                      ? 'text-text-muted'
                      : 'text-text-muted opacity-50'
                  "
                >
                  {{ formatMembersCount(project.assignedMembers) }}
                </span>
              </div>

              <!-- Hours -->
              <div class="min-w-[80px] shrink px-3">
                <span
                  class="text-[13px] font-semibold"
                  :class="
                    project.isActive ? 'text-text-dark' : 'text-text-muted'
                  "
                >
                  {{ formatHours(project.totalHours) }}
                </span>
              </div>

              <!-- Visibility badge -->
              <div class="min-w-[90px] shrink px-3">
                <span
                  v-if="project.visibility === 'public'"
                  class="bg-accent-tint text-brand rounded-sm px-2 py-[4px] text-xs font-semibold"
                  :class="{ 'opacity-50': !project.isActive }"
                >
                  Public
                </span>
                <span
                  v-else
                  class="bg-status-warn-bg text-status-warn-text rounded-sm px-2 py-[4px] text-xs font-semibold"
                  :class="{ 'opacity-50': !project.isActive }"
                >
                  Private
                </span>
              </div>

              <!-- Actions -->
              <div
                class="flex min-w-[130px] shrink items-center justify-end gap-2 px-3"
              >
                <button
                  class="text-brand cursor-pointer rounded px-[6px] py-[4px] text-[13px] font-semibold hover:opacity-75"
                  @click="openSettings(project)"
                >
                  Edit
                </button>
                <button
                  v-if="project.isActive"
                  class="text-destructive cursor-pointer rounded px-[6px] py-[4px] text-[13px] font-semibold hover:opacity-75"
                  @click="archiveProject(project)"
                >
                  Archive
                </button>
                <button
                  v-else
                  class="text-brand cursor-pointer rounded px-[6px] py-[4px] text-[13px] font-semibold hover:opacity-75"
                  @click="unarchiveProject(project)"
                >
                  Unarchive
                </button>
              </div>
            </div>

            <!-- Inline Project Settings Row -->
            <div
              v-if="expandedProjectId === project.id"
              class="bg-app-bg border-divider flex flex-col gap-[10px] border-t p-4"
            >
              <span class="text-text-dark text-[13px] font-semibold">
                Project settings
              </span>
              <div class="flex items-end gap-[10px]">
                <!-- Members MultiSelect: fills remaining space -->
                <AppFormField
                  label="Select members"
                  size="sm"
                  class="min-w-0 flex-1"
                >
                  <MultiSelect
                    v-model="editingMembers"
                    :options="assignableMembers"
                    option-label="label"
                    option-value="userId"
                    placeholder="Select members"
                    filter
                    display="chip"
                    class="w-full"
                  />
                </AppFormField>

                <!-- Visibility Select -->
                <AppFormField
                  label="Visibility"
                  size="sm"
                  class="min-w-[150px] shrink"
                >
                  <Select
                    v-model="editingVisibility"
                    :options="[
                      { value: 'public', label: 'Public' },
                      { value: 'private', label: 'Private' },
                    ]"
                    option-label="label"
                    option-value="value"
                    class="w-full"
                  />
                </AppFormField>

                <!-- Cancel -->
                <button
                  class="border-divider bg-surface text-text-dark cursor-pointer rounded-[6px] border px-[14px] py-[8px] text-[13px] font-medium hover:opacity-75 disabled:opacity-50"
                  :disabled="savingProjectId === project.id"
                  @click="cancelSettings"
                >
                  Cancel
                </button>

                <!-- Save -->
                <button
                  class="bg-brand text-surface cursor-pointer rounded-[6px] px-[14px] py-[8px] text-[13px] font-semibold hover:opacity-75 disabled:opacity-50"
                  :disabled="savingProjectId === project.id"
                  @click="saveSettings(project)"
                >
                  <span v-if="savingProjectId === project.id">Saving…</span>
                  <span v-else>Save</span>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
