import {
	backfillProjectBillableDefaultSchema,
	createProjectSchema,
	managementProjectSummaryResponseSchema,
	projectListResponseSchema,
	projectBillableDefaultBackfillResponseSchema,
	projectResponseSchema,
	taskListResponseSchema,
	timeEntryListQuerySchema,
	timeEntryListResponseSchema,
	updateProjectSchema,
	type BackfillProjectBillableDefaultInput,
	type CreateProjectInput,
	type ManagementProjectSummaryResponse,
	type ProjectBillableDefaultBackfillResponse,
	type ProjectListResponse,
	type ProjectResponse,
	type TaskListResponse,
	type TimeEntryListQuery,
	type TimeEntryListResponse,
	type UpdateProjectInput,
} from '@gitiempo/shared';
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from '@/services/api-client';

/* eslint-disable no-unused-vars */

interface AdminProjectsClientOptions {
	apiClient: Pick<AuthenticatedApiClient, 'requestJson' | 'requestNoContent'>;
}

export interface AdminProjectsClient {
	assignMember(
		projectId: string,
		userId: string,
	): Promise<void>;
	backfillProjectBillableDefault(
		projectId: string,
		input: BackfillProjectBillableDefaultInput,
	): Promise<ProjectBillableDefaultBackfillResponse>;
	createProject(
		input: CreateProjectInput,
	): Promise<ProjectResponse>;
	getManagementSummary(): Promise<ManagementProjectSummaryResponse>;
	listProjectTasks(projectId: string): Promise<TaskListResponse>;
	listProjectTimeEntries(
		projectId: string,
		query?: Partial<TimeEntryListQuery>,
	): Promise<TimeEntryListResponse>;
	listProjects(): Promise<ProjectListResponse>;
	removeAssignment(
		projectId: string,
		userId: string,
	): Promise<void>;
	updateProject(
		projectId: string,
		input: UpdateProjectInput,
	): Promise<ProjectResponse>;
}

function buildTimeEntryListQuery(
	query: Partial<TimeEntryListQuery> | undefined,
): string {
	const parsed = timeEntryListQuerySchema.parse(query ?? {});
	const searchParams = new URLSearchParams();

	searchParams.set('page', String(parsed.page));
	searchParams.set('limit', String(parsed.limit));

	if (parsed.dateFrom) {
		searchParams.set('dateFrom', parsed.dateFrom);
	}

	if (parsed.dateTo) {
		searchParams.set('dateTo', parsed.dateTo);
	}

	if (parsed.projectId) {
		searchParams.set('projectId', parsed.projectId);
	}

	if (parsed.taskId) {
		searchParams.set('taskId', parsed.taskId);
	}

	if (parsed.search) {
		searchParams.set('search', parsed.search);
	}

	return searchParams.toString();
}

export function createAdminProjectsClient({
	apiClient,
}: AdminProjectsClientOptions): AdminProjectsClient {
	return {
		async assignMember(projectId, userId) {
			await apiClient.requestNoContent({
				body: { userId },
				method: 'POST',
				path: `/projects/${projectId}/assignments`,
			});
		},

		backfillProjectBillableDefault(projectId, input) {
			return apiClient.requestJson({
				body: backfillProjectBillableDefaultSchema.parse(input),
				method: 'POST',
				path: `/projects/${projectId}/billable-default/backfill`,
				responseSchema: projectBillableDefaultBackfillResponseSchema,
			});
		},

		createProject(input) {
			return apiClient.requestJson({
				body: createProjectSchema.parse(input),
				method: 'POST',
				path: '/projects',
				responseSchema: projectResponseSchema,
			});
		},

		getManagementSummary() {
			return apiClient.requestJson({
				path: '/projects/management-summary',
				responseSchema: managementProjectSummaryResponseSchema,
			});
		},

		listProjects() {
			return apiClient.requestJson({
				path: '/projects',
				responseSchema: projectListResponseSchema,
			});
		},

		listProjectTasks(projectId) {
			return apiClient.requestJson({
				path: `/projects/${projectId}/tasks`,
				responseSchema: taskListResponseSchema,
			});
		},

		listProjectTimeEntries(projectId, query) {
			const search = buildTimeEntryListQuery(query);

			return apiClient.requestJson({
				path: `/projects/${projectId}/time-entries?${search}`,
				responseSchema: timeEntryListResponseSchema,
			});
		},

		async removeAssignment(projectId, userId) {
			await apiClient.requestNoContent({
				method: 'DELETE',
				path: `/projects/${projectId}/assignments/${userId}`,
			});
		},

		updateProject(projectId, input) {
			return apiClient.requestJson({
				body: updateProjectSchema.parse(input),
				method: 'PATCH',
				path: `/projects/${projectId}`,
				responseSchema: projectResponseSchema,
			});
		},
	};
}

function createDefaultAdminProjectsClient(): AdminProjectsClient {
	return createAdminProjectsClient({
		apiClient: getAuthenticatedAppApiClient(),
	});
}

export const adminProjectsClient: AdminProjectsClient = {
	assignMember(projectId, userId) {
		return createDefaultAdminProjectsClient().assignMember(
			projectId,
			userId,
		);
	},
	backfillProjectBillableDefault(projectId, input) {
		return createDefaultAdminProjectsClient().backfillProjectBillableDefault(
			projectId,
			input,
		);
	},
	createProject(input) {
		return createDefaultAdminProjectsClient().createProject(input);
	},
	getManagementSummary() {
		return createDefaultAdminProjectsClient().getManagementSummary();
	},
	listProjectTasks(projectId) {
		return createDefaultAdminProjectsClient().listProjectTasks(projectId);
	},
	listProjectTimeEntries(projectId, query) {
		return createDefaultAdminProjectsClient().listProjectTimeEntries(
			projectId,
			query,
		);
	},
	listProjects() {
		return createDefaultAdminProjectsClient().listProjects();
	},
	removeAssignment(projectId, userId) {
		return createDefaultAdminProjectsClient().removeAssignment(
			projectId,
			userId,
		);
	},
	updateProject(projectId, input) {
		return createDefaultAdminProjectsClient().updateProject(
			projectId,
			input,
		);
	},
};
