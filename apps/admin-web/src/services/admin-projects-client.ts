import {
	createProjectSchema,
	managementProjectSummaryResponseSchema,
	projectListResponseSchema,
	projectResponseSchema,
	updateProjectSchema,
	type CreateProjectInput,
	type ManagementProjectSummaryResponse,
	type ProjectListResponse,
	type ProjectResponse,
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
	createProject(
		input: CreateProjectInput,
	): Promise<ProjectResponse>;
	getManagementSummary(): Promise<ManagementProjectSummaryResponse>;
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
	createProject(input) {
		return createDefaultAdminProjectsClient().createProject(input);
	},
	getManagementSummary() {
		return createDefaultAdminProjectsClient().getManagementSummary();
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
