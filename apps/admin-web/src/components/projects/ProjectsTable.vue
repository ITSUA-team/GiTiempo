<script setup lang="ts">
  import { ref } from 'vue';
  import Select from 'primevue/select';
  import MultiSelect from 'primevue/multiselect';
  import { AppFormField } from '@gitiempo/web-shared';
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

  defineProps<{
    projects: ProjectWithAssignments[];
    assignableMembers: AssignableMember[];
    memberFilterOptions: { id: string | null; label: string }[];
    savingProjectId: string | null;
  }>();

  const emit = defineEmits<{
    archive: [project: ProjectWithAssignments];
    unarchive: [project: ProjectWithAssignments];
    save: [
      project: ProjectWithAssignments,
      members: string[],
      visibility: 'public' | 'private',
    ];
  }>();

  const selectedMemberFilter = defineModel<string | null>('memberFilter', {
    default: null,
  });

  const expandedProjectId = ref<string | null>(null);
  const editingMembers = ref<string[]>([]);
  const editingVisibility = ref<'public' | 'private'>('private');

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

  function saveSettings(project: ProjectWithAssignments) {
    emit('save', project, editingMembers.value, editingVisibility.value);
    expandedProjectId.value = null;
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
</script>

<template>
  <div class="bg-surface shadow-card flex flex-col gap-4 rounded-lg p-5">
    <!-- Card Header: title left, filter right -->
    <div class="flex items-end justify-between">
      <h2 class="text-text-dark text-lg font-semibold">Projects Table</h2>
      <div class="flex items-end gap-4">
        <div class="flex flex-col gap-1.5">
          <span class="text-text-muted text-xs font-medium"
            >Assigned member</span
          >
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
      <!-- Header Row -->
      <div class="bg-app-bg flex h-11 w-full items-center">
        <div class="min-w-0 flex-1 px-3">
          <span class="text-text-dark text-[13px] font-semibold">Project</span>
        </div>
        <div class="min-w-[100px] shrink px-3">
          <span class="text-text-dark text-[13px] font-semibold">Source</span>
        </div>
        <div class="min-w-[120px] shrink px-3">
          <span class="text-text-dark text-[13px] font-semibold"
            >Assigned members</span
          >
        </div>
        <div class="min-w-[80px] shrink px-3">
          <span class="text-text-dark text-[13px] font-semibold">Hours</span>
        </div>
        <div class="min-w-[90px] shrink px-3">
          <span class="text-text-dark text-[13px] font-semibold"
            >Visibility</span
          >
        </div>
        <div class="min-w-[130px] shrink px-3 text-right">
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
              :class="project.isActive ? 'text-text-dark' : 'text-text-muted'"
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
              @click="emit('archive', project)"
            >
              Archive
            </button>
            <button
              v-else
              class="text-brand cursor-pointer rounded px-[6px] py-[4px] text-[13px] font-semibold hover:opacity-75"
              @click="emit('unarchive', project)"
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
          <span class="text-text-dark text-[13px] font-semibold"
            >Project settings</span
          >
          <div class="flex items-end gap-[10px]">
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
