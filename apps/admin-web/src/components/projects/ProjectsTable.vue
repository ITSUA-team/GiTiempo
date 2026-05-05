<script setup lang="ts">
  import { ref, watch } from 'vue';
  import Button from 'primevue/button';
  import Select from 'primevue/select';
  import MultiSelect from 'primevue/multiselect';
  import ProgressSpinner from 'primevue/progressspinner';
  import { AppFormField, formatHours } from '@gitiempo/web-shared';
  import type {
    ProjectResponse,
    WorkspaceMemberResponse,
    ProjectAssignmentResponse,
  } from '@gitiempo/shared';

  export interface ProjectWithAssignments extends ProjectResponse {
    assignedMembers: ProjectAssignmentResponse[];
  }

  export interface AssignableMember extends WorkspaceMemberResponse {
    label: string;
  }

  const props = defineProps<{
    projects: ProjectWithAssignments[];
    assignableMembers: AssignableMember[];
    memberFilterOptions: { id: string | null; label: string }[];
    savingProjectId: string | null;
    closedProjectId?: string | null;
    loadingEditProjectId?: string | null;
  }>();

  const emit = defineEmits<{
    archive: [project: ProjectWithAssignments];
    unarchive: [project: ProjectWithAssignments];
    save: [
      project: ProjectWithAssignments,
      members: string[],
      visibility: 'public' | 'private',
    ];
    openEdit: [projectId: string];
  }>();

  const selectedMemberFilter = defineModel<string | null>('memberFilter', {
    default: null,
  });

  const expandedProjectId = ref<string | null>(null);
  const editingMembers = ref<string[]>([]);
  const editingVisibility = ref<'public' | 'private'>('private');
  // True while we're waiting for the lazy assignment fetch to come back.
  // Only during this window do we auto-sync editingMembers from the prop.
  const waitingForAssignments = ref(false);

  watch(
    () => props.closedProjectId,
    (id) => {
      if (id && id === expandedProjectId.value) {
        expandedProjectId.value = null;
        waitingForAssignments.value = false;
      }
    },
  );

  function openSettings(project: ProjectWithAssignments) {
    if (expandedProjectId.value === project.id) {
      expandedProjectId.value = null;
      waitingForAssignments.value = false;
      return;
    }
    emit('openEdit', project.id);
    expandedProjectId.value = project.id;
    editingMembers.value = project.assignedMembers.map((m) => m.userId);
    editingVisibility.value = project.visibility;
    // If assignments haven't loaded yet (empty), mark that we're waiting
    // so the watch below can populate editingMembers once they arrive.
    waitingForAssignments.value = project.assignedMembers.length === 0;
  }

  // One-shot sync: only fires while waitingForAssignments is true (i.e. the
  // panel just opened and the lazy fetch hadn't returned yet). Once we have
  // data we stop watching so user edits are never overwritten.
  watch(
    () =>
      props.projects.find((p) => p.id === expandedProjectId.value)
        ?.assignedMembers,
    (members) => {
      if (waitingForAssignments.value && members && members.length > 0) {
        editingMembers.value = members.map((m) => m.userId);
        waitingForAssignments.value = false;
      }
    },
  );

  function cancelSettings() {
    expandedProjectId.value = null;
  }

  function saveSettings(project: ProjectWithAssignments) {
    emit('save', project, editingMembers.value, editingVisibility.value);
  }

  function formatSource(source: string): string {
    return source === 'github' ? 'GitHub Repo' : 'Manual';
  }

  function formatMembersCount(project: ProjectWithAssignments): string {
    // After edit, use the live assignedMembers length; otherwise fall back to API-provided count
    const count =
      project.assignedMembers.length > 0
        ? project.assignedMembers.length
        : project.memberCount;
    if (!count) return '—';
    return `${count} member${count !== 1 ? 's' : ''}`;
  }
</script>

<template>
  <div class="bg-surface shadow-card flex flex-col gap-4 rounded-lg p-5">
    <!-- Card Header: title left, filter right -->
    <div class="flex items-end justify-between">
      <h2 class="text-text-dark text-lg font-semibold">Projects Table</h2>
      <div class="flex flex-col gap-1.5">
        <span class="text-text-muted text-xs font-medium">Assigned member</span>
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

    <!-- Table -->
    <div class="border-divider overflow-hidden rounded-sm border">
      <!-- Header Row -->
      <div class="bg-app-bg flex h-11 w-full items-center">
        <div class="min-w-0 flex-1 px-3">
          <span class="text-text-dark text-[13px] font-semibold">Project</span>
        </div>
        <div class="w-[140px] shrink-0 px-3">
          <span class="text-text-dark text-[13px] font-semibold">Source</span>
        </div>
        <div class="w-[220px] shrink-0 px-3">
          <span class="text-text-dark text-[13px] font-semibold"
            >Assigned members</span
          >
        </div>
        <div class="w-[120px] shrink-0 px-3">
          <span class="text-text-dark text-[13px] font-semibold">Hours</span>
        </div>
        <div class="w-[120px] shrink-0 px-3">
          <span class="text-text-dark text-[13px] font-semibold"
            >Visibility</span
          >
        </div>
        <div class="w-[150px] shrink-0 px-3 text-right">
          <span class="text-text-dark text-[13px] font-semibold">Actions</span>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="!projects.length"
        class="border-divider text-text-muted flex items-center justify-center border-t py-10 text-sm"
      >
        No projects found.
      </div>

      <!-- Project Rows -->
      <template v-for="(project, index) in projects" :key="project.id">
        <!-- Data Row -->
        <div
          class="flex h-14 w-full items-center"
          :class="{ 'border-divider border-t': index > 0 }"
        >
          <!-- Project name + Archived badge -->
          <div class="flex min-w-0 flex-1 items-center gap-2 px-3">
            <span
              class="truncate text-sm font-semibold"
              :class="project.isActive ? 'text-text-dark' : 'text-text-muted'"
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
          <div class="w-[140px] shrink-0 px-3">
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
          <div class="w-[220px] shrink-0 px-3">
            <span
              class="truncate text-[13px]"
              :class="
                project.isActive
                  ? 'text-text-muted'
                  : 'text-text-muted opacity-50'
              "
            >
              {{ formatMembersCount(project) }}
            </span>
          </div>

          <!-- Hours -->
          <div class="w-[120px] shrink-0 px-3">
            <span
              class="text-[13px] font-semibold"
              :class="project.isActive ? 'text-text-dark' : 'text-text-muted'"
            >
              {{ formatHours(project.totalHours) }}
            </span>
          </div>

          <!-- Visibility badge -->
          <div class="w-[120px] shrink-0 px-3">
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
            class="flex w-[150px] shrink-0 items-center justify-end gap-2 px-3"
          >
            <Button
              variant="text"
              size="small"
              label="Edit"
              @click="openSettings(project)"
            />
            <Button
              v-if="project.isActive"
              variant="text"
              severity="danger"
              size="small"
              label="Archive"
              @click="emit('archive', project)"
            />
            <Button
              v-else
              variant="text"
              size="small"
              label="Unarchive"
              @click="emit('unarchive', project)"
            />
          </div>
        </div>

        <!-- Inline Project Settings Row -->
        <div
          v-if="expandedProjectId === project.id"
          class="bg-app-bg border-divider flex flex-col gap-[10px] border-t p-4"
        >
          <span class="text-text-dark text-[13px] font-semibold"
            >Project settings</span
          >

          <!-- Loading assignments -->
          <div
            v-if="loadingEditProjectId === project.id"
            class="text-text-muted flex items-center gap-2 py-2 text-[13px]"
          >
            <ProgressSpinner
              stroke-width="4"
              style="width: 16px; height: 16px"
            />
            <span>Loading members…</span>
          </div>

          <div v-else class="flex items-end gap-[10px]">
            <!-- Members MultiSelect -->
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
            <Button
              variant="outlined"
              severity="secondary"
              label="Cancel"
              :disabled="savingProjectId === project.id"
              @click="cancelSettings"
            />

            <!-- Save -->
            <Button
              :label="savingProjectId === project.id ? 'Saving…' : 'Save'"
              :disabled="savingProjectId === project.id"
              @click="saveSettings(project)"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
