<script setup lang="ts">
import {
    type ManagementProjectSummaryResponse,
    type ProjectAssignmentListResponse,
    type ProjectListResponse,
    type WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { PageHeader, type StatItem } from '@gitiempo/web-shared/components';
import { storeToRefs } from 'pinia';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import NewProjectDialog from '@/components/projects/NewProjectDialog.vue';
import ProjectsTable from '@/components/projects/ProjectsTable.vue';
import { useAuthStore } from '@/stores/auth';
import {
    assignMember,
    createProject,
    fetchProjectAssignments,
    fetchProjectSummary,
    fetchProjects,
    removeAssignment,
    updateProject,
} from '@/services/projects';
import { fetchMembers } from '@/services/members';

// ─── Auth ─────────────────────────────────────────────────────────────────────
const authStore = useAuthStore();
const { accessToken } = storeToRefs(authStore);
const toast = useToast();

// ─── State ────────────────────────────────────────────────────────────────────
const loading = ref(true);
const assignmentsLoading = ref(false);
const projects = ref<ProjectListResponse>([]);
const summary = ref<ManagementProjectSummaryResponse | null>(null);
const members = ref<WorkspaceMemberListResponse>([]);
const assignments = ref<Record<string, ProjectAssignmentListResponse>>({});

// ─── Data loading ─────────────────────────────────────────────────────────────
async function loadAll(): Promise<void> {
    const token = accessToken.value;
    if (!token) return;

    try {
        loading.value = true;
        const [fetchedSummary, fetchedProjects, fetchedMembers] =
            await Promise.all([
                fetchProjectSummary(token).catch((err: unknown) => {
                    toast.add({
                        severity: 'error',
                        summary: 'Failed to load summary',
                        detail: String(err),
                        life: 4000,
                    });
                    return null;
                }),
                fetchProjects(token).catch((err: unknown) => {
                    toast.add({
                        severity: 'error',
                        summary: 'Failed to load projects',
                        detail: String(err),
                        life: 4000,
                    });
                    return [] as ProjectListResponse;
                }),
                fetchMembers(token).catch((err: unknown) => {
                    toast.add({
                        severity: 'error',
                        summary: 'Failed to load members',
                        detail: String(err),
                        life: 4000,
                    });
                    return [] as WorkspaceMemberListResponse;
                }),
            ]);

        summary.value = fetchedSummary;
        projects.value = fetchedProjects;
        members.value = fetchedMembers;
    } finally {
        loading.value = false;
    }

    // Fan-out assignments fetch
    assignmentsLoading.value = true;
    try {
        const token2 = accessToken.value;
        if (!token2) return;
        const results = await Promise.all(
            projects.value.map((p) =>
                fetchProjectAssignments(token2, p.id)
                    .then((a) => ({ id: p.id, a }))
                    .catch(() => ({
                        id: p.id,
                        a: [] as ProjectAssignmentListResponse,
                    })),
            ),
        );
        const fresh: Record<string, ProjectAssignmentListResponse> = {};
        for (const { id, a } of results) {
            fresh[id] = a;
        }
        assignments.value = fresh;
    } finally {
        assignmentsLoading.value = false;
    }
}

onMounted(() => {
    void loadAll();
});

// ─── Summary stats ────────────────────────────────────────────────────────────
const summaryStats = computed<StatItem[]>(() => {
    if (!summary.value) return [];
    return [
        { label: 'Active Projects', value: summary.value.activeProjects },
        { label: 'Private', value: summary.value.privateProjects },
        { label: 'Public', value: summary.value.publicProjects },
    ];
});

// ─── Member filter ────────────────────────────────────────────────────────────
const filterMemberId = ref<string>('all');

const nonAdminMembers = computed(() =>
    members.value.filter((m) => m.role !== 'admin'),
);

const memberOptions = computed(() => [
    { label: 'All members', value: 'all' },
    ...nonAdminMembers.value.map((m) => ({
        label: `${m.displayName ?? m.email} (${m.role})`,
        value: m.userId,
    })),
]);

const filteredProjects = computed(() =>
    projects.value.filter(
        (p) =>
            filterMemberId.value === 'all' ||
            (assignments.value[p.id] ?? []).some(
                (a) => a.userId === filterMemberId.value,
            ),
    ),
);

// ─── Visibility options ───────────────────────────────────────────────────────
const visibilityOptions = [
    { label: 'Public', value: 'public' },
    { label: 'Private', value: 'private' },
];

// ─── New Project dialog ───────────────────────────────────────────────────────
const newProjectVisible = ref(false);
const newProjectSaving = ref(false);

async function submitNewProject(payload: {
    name: string;
    visibility: 'public' | 'private';
}): Promise<void> {
    const token = accessToken.value;
    if (!token) return;
    newProjectSaving.value = true;
    try {
        await createProject(token, payload);
        newProjectVisible.value = false;
        await loadAll();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Failed to create project',
            detail: String(err),
            life: 4000,
        });
    } finally {
        newProjectSaving.value = false;
    }
}

// ─── Expanded rows ────────────────────────────────────────────────────────────
const expandedRows = ref<Record<string, boolean>>({});
const editMembers = reactive<Record<string, string[]>>({});
const editVisibility = reactive<Record<string, string>>({});
const savingRows = reactive<Record<string, boolean>>({});

watch(expandedRows, (next) => {
    for (const projectId of Object.keys(next)) {
        if (next[projectId] && editMembers[projectId] === undefined) {
            editMembers[projectId] = (assignments.value[projectId] ?? []).map(
                (a) => a.userId,
            );
            const proj = projects.value.find((p) => p.id === projectId);
            editVisibility[projectId] = proj?.visibility ?? 'public';
        }
    }
});

function toggleRow(projectId: string): void {
    if (expandedRows.value[projectId]) {
        collapseRow(projectId);
    } else {
        expandedRows.value = { [projectId]: true };
    }
}

function collapseRow(projectId: string): void {
    const next = { ...expandedRows.value };
    delete next[projectId];
    expandedRows.value = next;
    delete editMembers[projectId];
    delete editVisibility[projectId];
}

const memberSelectOptions = computed(() =>
    nonAdminMembers.value.map((m) => ({
        label: `${m.displayName ?? m.email} (${m.role})`,
        value: m.userId,
    })),
);

async function saveRow(projectId: string): Promise<void> {
    const token = accessToken.value;
    if (!token) return;
    savingRows[projectId] = true;
    try {
        const original = (assignments.value[projectId] ?? []).map(
            (a) => a.userId,
        );
        const current = editMembers[projectId] ?? [];
        const toAdd = current.filter((uid) => !original.includes(uid));
        const toRemove = (assignments.value[projectId] ?? []).filter(
            (a) => !current.includes(a.userId),
        );

        await Promise.all([
            ...toAdd.map((uid) => assignMember(token, projectId, uid)),
            ...toRemove.map((a) => removeAssignment(token, projectId, a.id)),
        ]);

        const proj = projects.value.find((p) => p.id === projectId);
        if (proj && editVisibility[projectId] !== proj.visibility) {
            await updateProject(token, projectId, {
                visibility: editVisibility[projectId] as 'public' | 'private',
            });
        }

        await loadAll();

        collapseRow(projectId);
        toast.add({
            severity: 'success',
            summary: 'Project updated',
            life: 3000,
        });
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Failed to save changes',
            detail: String(err),
            life: 4000,
        });
    } finally {
        savingRows[projectId] = false;
    }
}

// ─── Archive ──────────────────────────────────────────────────────────────────
async function archiveProject(projectId: string): Promise<void> {
    const token = accessToken.value;
    if (!token) return;
    try {
        await updateProject(token, projectId, { isActive: false });
        await loadAll();
        toast.add({
            severity: 'success',
            summary: 'Project archived',
            life: 3000,
        });
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Failed to archive project',
            detail: String(err),
            life: 4000,
        });
    }
}

function onUpdateEditMembers(id: string, value: string[]): void {
    editMembers[id] = value;
}

function onUpdateEditVisibility(id: string, value: string): void {
    editVisibility[id] = value;
}
</script>

<template>
  <div class="bg-app-bg flex min-h-full flex-col gap-6 p-6">
    <!-- Full-page loading spinner -->
    <div
      v-if="loading"
      class="flex h-full items-center justify-center py-24"
    >
      <ProgressSpinner
        stroke-width="3"
        style="width: 40px; height: 40px"
      />
    </div>

    <template v-else>
      <!-- Page header with stat cards -->
      <PageHeader
        title="Projects"
        description="Manage project visibility, member assignments, and manual project creation."
        :stats="summaryStats"
      >
        <Button
          label="New Project"
          :pt="{
            root: 'h-[38px] px-4 rounded-[6px] bg-brand text-surface text-sm font-semibold',
          }"
          @click="newProjectVisible = true"
        />
      </PageHeader>

      <!-- Projects table card -->
      <ProjectsTable
        :projects="filteredProjects"
        :assignments="assignments"
        :member-options="memberOptions"
        :member-select-options="memberSelectOptions"
        :visibility-options="visibilityOptions"
        :assignments-loading="assignmentsLoading"
        :expanded-rows="expandedRows"
        :edit-members="editMembers"
        :edit-visibility="editVisibility"
        :saving-rows="savingRows"
        :filter-member-id="filterMemberId"
        @update:expanded-rows="expandedRows = $event"
        @update:filter-member-id="filterMemberId = $event"
        @update:edit-members="onUpdateEditMembers"
        @update:edit-visibility="onUpdateEditVisibility"
        @toggle-row="toggleRow"
        @archive-project="archiveProject"
        @save-row="saveRow"
        @collapse-row="collapseRow"
      />
    </template>

    <!-- New Project dialog -->
    <NewProjectDialog
      v-model:visible="newProjectVisible"
      :saving="newProjectSaving"
      :visibility-options="visibilityOptions"
      @submit="submitNewProject"
    />
  </div>
</template>
