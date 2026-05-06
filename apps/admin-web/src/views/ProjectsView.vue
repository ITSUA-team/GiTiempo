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
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import ProgressSpinner from 'primevue/progressspinner';
import Select from 'primevue/select';
import Skeleton from 'primevue/skeleton';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, reactive, ref, watch } from 'vue';
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
const assignments = reactive(new Map<string, ProjectAssignmentListResponse>());

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
		assignments.clear();
		for (const { id, a } of results) {
			assignments.set(id, a);
		}
	} finally {
		assignmentsLoading.value = false;
	}
}

onMounted(() => {
	void loadAll();
});

// ─── Summary stats ────────────────────────────────────────────────────────────
const summaryStats = computed<StatItem[]>(() => [
	{ label: 'Active Projects', value: summary.value?.activeProjects ?? '—' },
	{ label: 'Private', value: summary.value?.privateProjects ?? '—' },
	{ label: 'Public', value: summary.value?.publicProjects ?? '—' },
]);

// ─── Member filter ────────────────────────────────────────────────────────────
const filterMemberId = ref<string | null>(null);

const memberOptions = computed(() => [
	{ label: 'All members', value: null },
	...members.value.map((m) => ({
		label: `${m.displayName ?? m.email} (${m.role})`,
		value: m.userId,
	})),
]);

const filteredProjects = computed(() =>
	projects.value.filter(
		(p) =>
			!filterMemberId.value ||
			(assignments.get(p.id) ?? []).some(
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
const newProjectName = ref('');
const newProjectVisibility = ref<'public' | 'private'>('public');
const newProjectNameError = ref('');
const newProjectSaving = ref(false);

async function submitNewProject(): Promise<void> {
	newProjectNameError.value = '';
	if (!newProjectName.value.trim()) {
		newProjectNameError.value = 'Project name is required.';
		return;
	}
	const token = accessToken.value;
	if (!token) return;
	newProjectSaving.value = true;
	try {
		await createProject(token, {
			name: newProjectName.value.trim(),
			visibility: newProjectVisibility.value,
		});
		newProjectVisible.value = false;
		newProjectName.value = '';
		newProjectVisibility.value = 'public';
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
			editMembers[projectId] = (assignments.get(projectId) ?? []).map(
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
		// Single-row enforcement
		expandedRows.value = { [projectId]: true };
	}
}

function collapseRow(projectId: string): void {
	const next = { ...expandedRows.value };
	delete next[projectId];
	expandedRows.value = next;
}

const memberSelectOptions = computed(() =>
	members.value.map((m) => ({
		label: `${m.displayName ?? m.email} (${m.role})`,
		value: m.userId,
	})),
);

async function saveRow(projectId: string): Promise<void> {
	const token = accessToken.value;
	if (!token) return;
	savingRows[projectId] = true;
	try {
		const original = (assignments.get(projectId) ?? []).map(
			(a) => a.userId,
		);
		const current = editMembers[projectId] ?? [];
		const toAdd = current.filter((uid) => !original.includes(uid));
		const toRemove = (assignments.get(projectId) ?? []).filter(
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

		// Reload just this project's assignments
		const fresh = await fetchProjectAssignments(token, projectId);
		assignments.set(projectId, fresh);

		// Update local project visibility
		const idx = projects.value.findIndex((p) => p.id === projectId);
		if (idx !== -1) {
			projects.value[idx] = {
				...projects.value[idx],
				visibility: editVisibility[projectId] as 'public' | 'private',
			};
		}

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
					class="bg-brand text-surface h-9 rounded-sm px-4 text-sm font-semibold"
					@click="newProjectVisible = true"
				/>
			</PageHeader>

			<!-- Projects card -->
			<div
				class="shadow-card bg-surface flex flex-col gap-4 rounded-lg p-5"
			>
				<!-- Table header row -->
				<div class="flex items-center justify-between">
					<h2 class="text-text-dark text-lg font-semibold">
						Projects Table
					</h2>

					<!-- Assigned member filter -->
					<div class="flex flex-col gap-1.5">
						<p class="text-text-muted text-xs font-medium">
							Assigned member
						</p>
						<Select
							v-model="filterMemberId"
							:options="memberOptions"
							option-label="label"
							option-value="value"
							class="h-[38px] w-[260px] rounded-sm"
						/>
					</div>
				</div>

				<!-- DataTable -->
				<DataTable
					v-model:expanded-rows="expandedRows"
					:value="filteredProjects"
					data-key="id"
					:pt="{
						headerCell:
							'bg-app-bg h-[44px] text-[13px] font-semibold text-text-dark px-3',
						bodyRow: 'h-[56px] border-t border-divider',
						bodyCell: 'px-3',
					}"
				>
					<!-- Empty state -->
					<template #empty>
						<div class="text-text-muted py-8 text-center text-sm">
							No projects yet.
						</div>
					</template>

					<!-- Project name -->
					<Column field="name" header="Project">
						<template #body="{ data }">
							<span v-if="assignmentsLoading">
								<Skeleton height="1rem" />
							</span>
							<span
								v-else
								class="text-text-dark text-sm font-semibold"
								>{{ data.name }}</span
							>
						</template>
					</Column>

					<!-- Source -->
					<Column header="Source" style="width: 140px">
						<template #body="{ data }">
							<span
								class="text-text-muted text-[13px] font-normal"
							>
								{{
									data.source === 'github'
										? 'GitHub Repo'
										: 'Manual'
								}}
							</span>
						</template>
					</Column>

					<!-- Assigned members -->
					<Column header="Assigned members" style="width: 220px">
						<template #body="{ data }">
							<span v-if="assignmentsLoading">
								<Skeleton height="1rem" />
							</span>
							<span
								v-else
								class="text-text-muted text-[13px] font-normal"
							>
								{{
									(assignments.get(data.id) ?? []).length
								}}
								members
							</span>
						</template>
					</Column>

					<!-- Hours -->
					<Column header="Hours" style="width: 120px">
						<template #body="{ data }">
							<span
								class="text-text-dark text-[13px] font-semibold"
								>{{ data.totalHours }}h</span
							>
						</template>
					</Column>

					<!-- Visibility -->
					<Column header="Visibility" style="width: 120px">
						<template #body="{ data }">
							<span
								v-if="data.visibility === 'public'"
								class="bg-accent-tint text-brand rounded-sm px-2 py-1 text-xs font-semibold"
								>Public</span
							>
							<span
								v-else
								class="bg-status-warn-bg text-status-warn-text rounded-sm px-2 py-1 text-xs font-semibold"
								>Private</span
							>
						</template>
					</Column>

					<!-- Actions -->
					<Column header="Actions" style="width: 150px">
						<template #body="{ data }">
							<div class="flex items-center justify-end gap-2">
								<Button
									variant="text"
									label="Edit"
									class="text-brand p-1 text-[13px] font-semibold"
									@click="toggleRow(data.id)"
								/>
								<Button
									variant="text"
									label="Archive"
									class="text-destructive p-1 text-[13px] font-semibold"
									@click="archiveProject(data.id)"
								/>
							</div>
						</template>
					</Column>

					<!-- Inline settings expansion -->
					<template #expansion="{ data }">
						<div
							class="bg-app-bg border-divider flex items-end gap-[10px] border-t p-4"
						>
							<div class="flex flex-col gap-[6px]">
								<p
									class="text-text-dark text-[13px] font-semibold"
								>
									Project settings
								</p>
							</div>

							<!-- Members MultiSelect -->
							<div class="flex flex-1 flex-col gap-1.5">
								<label
									class="text-text-muted text-xs font-medium"
									>Select members</label
								>
								<MultiSelect
									v-model="editMembers[data.id]"
									:options="memberSelectOptions"
									option-label="label"
									option-value="value"
									class="h-[38px] w-full rounded-sm"
									placeholder="Select members"
								/>
							</div>

							<!-- Visibility Select -->
							<div class="flex w-[180px] flex-col gap-1.5">
								<label
									class="text-text-muted text-xs font-medium"
									>Visibility</label
								>
								<Select
									v-model="editVisibility[data.id]"
									:options="visibilityOptions"
									option-label="label"
									option-value="value"
									class="h-[38px] w-full rounded-sm"
								/>
							</div>

							<!-- Cancel -->
							<Button
								severity="secondary"
								variant="outlined"
								label="Cancel"
								class="h-[34px] rounded-sm"
								@click="collapseRow(data.id)"
							/>

							<!-- Save -->
							<Button
								label="Save"
								class="bg-brand text-surface h-[34px] rounded-sm"
								:loading="savingRows[data.id]"
								@click="saveRow(data.id)"
							/>
						</div>
					</template>
				</DataTable>
			</div>
		</template>

		<!-- New Project dialog -->
		<Dialog
			v-model:visible="newProjectVisible"
			header="New Project"
			modal
			class="w-[480px]"
		>
			<div class="flex flex-col gap-4 pt-2">
				<!-- Name field -->
				<div class="flex flex-col gap-1">
					<label class="text-text-dark text-[13px] font-medium"
						>Project name</label
					>
					<InputText
						v-model="newProjectName"
						:invalid="!!newProjectNameError"
						class="w-full"
						placeholder="e.g. Project Orion"
					/>
					<small
						v-if="newProjectNameError"
						class="text-destructive text-xs"
					>
						{{ newProjectNameError }}
					</small>
				</div>

				<!-- Visibility field -->
				<div class="flex flex-col gap-1">
					<label class="text-text-dark text-[13px] font-medium"
						>Visibility</label
					>
					<Select
						v-model="newProjectVisibility"
						:options="visibilityOptions"
						option-label="label"
						option-value="value"
						class="w-full"
					/>
				</div>
			</div>

			<template #footer>
				<div class="flex justify-end gap-2">
					<Button
						severity="secondary"
						variant="outlined"
						label="Cancel"
						@click="newProjectVisible = false"
					/>
					<Button
						label="Create"
						:loading="newProjectSaving"
						@click="submitNewProject"
					/>
				</div>
			</template>
		</Dialog>
	</div>
</template>
