<script setup lang="ts">
import {
    type ProjectAssignmentListResponse,
    type ProjectListResponse,
    type WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { PageHeader, type StatItem } from '@gitiempo/web-shared/components';
import { storeToRefs } from 'pinia';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import ProjectsTable from '@/components/projects/ProjectsTable.vue';
import { useAuthStore } from '@/stores/auth';
import {
    assignMember,
    fetchProjectAssignments,
    fetchProjects,
    removeAssignment,
    unarchiveProject as unarchiveProjectService,
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
const members = ref<WorkspaceMemberListResponse>([]);
const assignments = ref<Record<string, ProjectAssignmentListResponse>>({});

// ─── Data loading ─────────────────────────────────────────────────────────────
async function loadAll(): Promise<void> {
    const token = accessToken.value;
    if (!token) return;

    try {
        loading.value = true;
        const [fetchedProjects, fetchedMembers] =
            await Promise.all([
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

        projects.value = fetchedProjects;
        members.value = fetchedMembers;
    } finally {
        loading.value = false;
    }

    // Fan-out assignments fetch
    assignmentsLoading.value = true;
    try {
        const results = await Promise.all(
            projects.value.map((p) =>
                fetchProjectAssignments(token, p.id)
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
const summaryStats = computed<StatItem[]>(() => [
    {
        label: 'Active Projects',
        value: projects.value.filter((p) => p.isActive).length,
    },
    {
        label: 'Private',
        value: projects.value.filter((p) => p.isActive && p.visibility === 'private').length,
    },
    {
        label: 'Public',
        value: projects.value.filter((p) => p.isActive && p.visibility === 'public').length,
    },
]);

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

const filteredProjects = computed(() => {
    const filtered = projects.value.filter(
        (p) =>
            filterMemberId.value === 'all' ||
            (assignments.value[p.id] ?? []).some(
                (a) => a.userId === filterMemberId.value,
            ),
    );
    // Active projects first, archived at the bottom
    return [...filtered].sort((a, b) => {
        if (a.isActive === b.isActive) return 0;
        return a.isActive ? -1 : 1;
    });
});

// ─── Visibility options ───────────────────────────────────────────────────────
const visibilityOptions = [
    { label: 'Public', value: 'public' },
    { label: 'Private', value: 'private' },
];

// ─── Expanded rows ────────────────────────────────────────────────────────────
const expandedRows = ref<Record<string, boolean>>({});
const editMembers = reactive<Record<string, string[]>>({});
const editVisibility = reactive<Record<string, 'public' | 'private'>>({});
const savingRows = reactive<Record<string, boolean>>({});

watch(expandedRows, (next) => {
    for (const projectId of Object.keys(next)) {
        if (next[projectId] && editMembers[projectId] === undefined) {
            editMembers[projectId] = (assignments.value[projectId] ?? []).map(
                (a) => a.userId,
            );
            const proj = projects.value.find((p) => p.id === projectId);
            editVisibility[projectId] = (proj?.visibility ?? 'public') as 'public' | 'private';
        }
    }
});

function toggleRow(projectId: string): void {
    const proj = projects.value.find((p) => p.id === projectId);
    if (!proj?.isActive) return;
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
        const original = assignments.value[projectId] ?? [];
        const originalUserIds = original.map((a) => a.userId);
        const current = editMembers[projectId] ?? [];
        const toAdd = current.filter((uid) => !originalUserIds.includes(uid));
        const toRemove = original.filter((a) => !current.includes(a.userId));

        const [newAssignments] = await Promise.all([
            toAdd.length > 0
                ? Promise.all(toAdd.map((uid) => assignMember(token, projectId, uid)))
                : Promise.resolve([]),
            ...toRemove.map((a) => removeAssignment(token, projectId, a.userId)),
        ]);

        const newVisibility = editVisibility[projectId] as 'public' | 'private';
        const proj = projects.value.find((p) => p.id === projectId);
        if (proj && newVisibility !== proj.visibility) {
            await updateProject(token, projectId, { visibility: newVisibility });
        }

        // Update assignments: keep survivors + add newly returned assignment objects
        const survivors = original.filter((a) => current.includes(a.userId));
        assignments.value = {
            ...assignments.value,
            [projectId]: [...survivors, ...(newAssignments as typeof original)],
        };

        // Update visibility in projects list
        projects.value = projects.value.map((p) =>
            p.id === projectId ? { ...p, visibility: newVisibility } : p,
        );

        collapseRow(projectId);
        toast.add({ severity: 'success', summary: 'Project updated', life: 3000 });
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
        projects.value = projects.value.map((p) =>
            p.id === projectId ? { ...p, isActive: false } : p,
        );
        toast.add({ severity: 'success', summary: 'Project archived', life: 3000 });
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Failed to archive project',
            detail: String(err),
            life: 4000,
        });
    }
}

async function unarchiveProject(projectId: string): Promise<void> {
    const token = accessToken.value;
    if (!token) return;
    try {
        await unarchiveProjectService(token, projectId);
        projects.value = projects.value.map((p) =>
            p.id === projectId ? { ...p, isActive: true } : p,
        );
        toast.add({ severity: 'success', summary: 'Project unarchived', life: 3000 });
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Failed to unarchive project',
            detail: String(err),
            life: 4000,
        });
    }
}

function onUpdateEditMembers(id: string, value: string[]): void {
    editMembers[id] = value;
}

function onUpdateEditVisibility(id: string, value: 'public' | 'private'): void {
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
        description="Manage project visibility and member assignments."
        :stats="summaryStats"
      />

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
        @unarchive-project="unarchiveProject"
        @save-row="saveRow"
        @collapse-row="collapseRow"
      />
    </template>
  </div>
</template>
