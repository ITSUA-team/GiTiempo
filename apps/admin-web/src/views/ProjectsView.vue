<script setup lang="ts">
  import { computed, onMounted, ref, shallowRef } from 'vue';
  import { useRouter } from 'vue-router';
  import { useToast } from 'primevue/usetoast';
  import { useConfirm } from 'primevue/useconfirm';
  import Button from 'primevue/button';
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
  import Dialog from 'primevue/dialog';
  import Select from 'primevue/select';
  import MultiSelect from 'primevue/multiselect';
  import Avatar from 'primevue/avatar';
  import Tag from 'primevue/tag';
  import ProgressSpinner from 'primevue/progressspinner';
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
  const confirm = useConfirm();
  const router = useRouter();
  const authStore = useAuthStore();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const projectsClient: ProjectsClient = createProjectsClient({ apiBaseUrl });
  const membersClient: MembersClient = createMembersClient({ apiBaseUrl });

  // Types
  interface ProjectWithAssignments extends ProjectResponse {
    assignedMembers: ProjectAssignmentResponse[];
  }

  // State
  const projects = shallowRef<ProjectWithAssignments[]>([]);
  const members = shallowRef<WorkspaceMemberResponse[]>([]);
  const loading = ref(true);
  const selectedMemberFilter = ref<string | null>(null);
  const showSettingsDialog = ref(false);
  const editingProject = shallowRef<ProjectWithAssignments | null>(null);
  const editingMembers = ref<string[]>([]);
  const editingVisibility = ref<'public' | 'private' | null>(null);

  // Computed
  const filteredProjects = computed(() => {
    if (!selectedMemberFilter.value) return projects.value;
    return projects.value.filter((p) =>
      p.assignedMembers.some((m) => m.userId === selectedMemberFilter.value),
    );
  });

  // Load data
  async function loadData() {
    if (!authStore.accessToken) return;
    const accessToken = authStore.accessToken; // Narrow type for TypeScript
    try {
      loading.value = true;
      const projectsData = await projectsClient.listProjects(accessToken);
      const membersData = await membersClient.listMembers(accessToken);

      // Fetch assignments for each project
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
            // If assignments fetch fails, assume no assignments
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

  // Create project
  async function openCreateDialog() {
    await router.push({ name: routeNames.addProject });
  }

  // Edit project
  function openSettingsDialog(project: ProjectWithAssignments) {
    editingProject.value = project;
    editingMembers.value = project.assignedMembers.map((m) => m.userId);
    editingVisibility.value = project.visibility;
    showSettingsDialog.value = true;
  }

  async function saveSettings() {
    if (!editingProject.value || !authStore.accessToken) return;
    try {
      // TODO: Implement save logic
      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Project settings updated',
      });
      showSettingsDialog.value = false;
      await loadData();
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail:
          error instanceof Error ? error.message : 'Failed to save settings',
      });
    }
  }

  // Delete project
  function deleteProject(project: ProjectWithAssignments) {
    confirm.require({
      message: `Delete project "${project.name}"? This action cannot be undone.`,
      header: 'Delete project?',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptProps: { severity: 'danger' },
      accept: async () => {
        // TODO: Implement delete logic
        try {
          toast.add({
            severity: 'success',
            summary: 'Deleted',
            detail: `Project "${project.name}" deleted`,
          });
          await loadData();
        } catch (error) {
          toast.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error instanceof Error
                ? error.message
                : 'Failed to delete project',
          });
        }
      },
    });
  }

  // Get display name for member
  function getMemberDisplayName(member: WorkspaceMemberResponse): string {
    return member.displayName ?? member.email;
  }

  // Format hours
  function formatHours(hours: number): string {
    if (hours === 0) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours % 1) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  // Get source badge
  function getSourceBadge(source: string): { severity: string; text: string } {
    return source === 'github'
      ? { severity: 'info', text: 'GitHub' }
      : { severity: 'secondary', text: 'Manual' };
  }

  onMounted(() => loadData());
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-text-dark text-2xl font-semibold">Projects</h1>
        <p class="text-text-muted text-sm">
          Manage workspace projects and member assignments
        </p>
      </div>
      <Button label="Create Project" @click="openCreateDialog" />
    </div>

    <!-- Filter and List -->
    <div class="bg-surface shadow-card rounded-lg p-4">
      <div class="mb-4">
        <label for="memberFilter" class="text-text-dark text-[13px] font-medium"
          >Assigned Member</label
        >
        <Select
          id="memberFilter"
          v-model="selectedMemberFilter"
          :options="[
            { userId: null, displayName: 'All members', email: '' },
            ...members.map((m) => ({
              userId: m.id,
              displayName: getMemberDisplayName(m),
              email: m.email,
            })),
          ]"
          option-label="displayName"
          option-value="userId"
          placeholder="All members"
          class="w-full"
        />
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-8">
        <ProgressSpinner stroke-width="3" style="width: 40px; height: 40px" />
      </div>

      <!-- Projects Table -->
      <DataTable
        v-else
        :value="filteredProjects"
        striped-rows
        responsive-layout="scroll"
        :pt="{
          headerCell:
            'bg-app-bg text-[13px] font-medium uppercase tracking-wide text-text-dark',
          bodyRow: 'border-b border-divider h-12 hover:bg-app-bg',
          bodyCell: 'text-sm',
        }"
      >
        <Column field="name" header="Project" />
        <Column field="source" header="Source">
          <template #body="{ data }">
            <Tag
              :severity="getSourceBadge(data.source).severity"
              :value="getSourceBadge(data.source).text"
            />
          </template>
        </Column>
        <Column header="Members">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Avatar
                v-for="assignment in data.assignedMembers"
                :key="assignment.userId"
                :image="assignment.avatarUrl ?? undefined"
                :label="
                  !assignment.avatarUrl
                    ? (assignment.displayName?.charAt(0).toUpperCase() ?? '?')
                    : undefined
                "
                shape="circle"
                class="size-8"
                :title="assignment.displayName ?? assignment.email"
                :pt="{
                  root: 'bg-accent-tint text-brand text-[13px] font-semibold',
                }"
              />
              <span v-if="!data.assignedMembers?.length" class="text-text-muted"
                >None</span
              >
            </div>
          </template>
        </Column>
        <Column
          field="totalHours"
          header="Total Hours"
          header-class="text-right"
          body-class="text-right"
        >
          <template #body="{ data }">
            {{ formatHours(data.totalHours) }}
          </template>
        </Column>
        <Column field="visibility" header="Visibility">
          <template #body="{ data }">
            <Tag
              :severity="data.visibility === 'public' ? 'info' : 'secondary'"
              :value="data.visibility === 'public' ? 'Public' : 'Private'"
            />
          </template>
        </Column>
        <Column header="Actions" body-class="text-right">
          <template #body="{ data }">
            <Button
              icon="pi pi-pencil"
              variant="text"
              severity="secondary"
              rounded
              :title="`Edit ${data.name}`"
              @click="openSettingsDialog(data)"
            />
            <Button
              icon="pi pi-trash"
              variant="text"
              severity="danger"
              rounded
              :title="`Delete ${data.name}`"
              @click="deleteProject(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Settings Dialog -->
    <Dialog
      v-model:visible="showSettingsDialog"
      modal
      header="Edit Project"
      :style="{ width: '480px' }"
      @hide="() => (showSettingsDialog = false)"
    >
      <template #default>
        <div v-if="editingProject" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <label
              for="settingsVisibility"
              class="text-text-dark text-[13px] font-medium"
              >Visibility</label
            >
            <Select
              id="settingsVisibility"
              v-model="editingVisibility"
              :options="[
                { value: 'public', label: 'Public' },
                { value: 'private', label: 'Private' },
              ]"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="settingsMembers"
              class="text-text-dark text-[13px] font-medium"
              >Assigned Members</label
            >
            <MultiSelect
              id="settingsMembers"
              v-model="editingMembers"
              :options="members"
              option-label="displayName"
              option-value="id"
              placeholder="Select members"
              filter
              display="chip"
              class="w-full"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          variant="text"
          @click="showSettingsDialog = false"
        />
        <Button label="Save" @click="saveSettings" />
      </template>
    </Dialog>
  </div>
</template>
