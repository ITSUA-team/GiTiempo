import {
	createProjectSchema,
	managementProjectSummaryResponseSchema,
	projectListResponseSchema,
	projectResponseSchema,
	updateProjectSchema,
	workspaceMemberListResponseSchema,
	type CreateProjectInput,
	type ManagementProjectSummaryResponse,
	type ProjectListResponse,
	type ProjectResponse,
	type UpdateProjectInput,
	type WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import {
	getRequestUrl,
	getResponseErrorMessage,
	requestJson,
} from '@gitiempo/web-shared/http';

/* eslint-disable no-unused-vars */

interface AdminProjectsClientOptions {
	apiBaseUrl: string | undefined;
	fetchFn: typeof fetch;
}

export interface AdminProjectsClient {
	assignMember(
		accessToken: string,
		projectId: string,
		userId: string,
	): Promise<void>;
	createProject(
		accessToken: string,
		input: CreateProjectInput,
	): Promise<ProjectResponse>;
	getManagementSummary(
		accessToken: string,
	): Promise<ManagementProjectSummaryResponse>;
	listMembers(accessToken: string): Promise<WorkspaceMemberListResponse>;
	listProjects(accessToken: string): Promise<ProjectListResponse>;
	removeAssignment(
		accessToken: string,
		projectId: string,
		userId: string,
	): Promise<void>;
	updateProject(
		accessToken: string,
		projectId: string,
		input: UpdateProjectInput,
	): Promise<ProjectResponse>;
}

export function createAdminProjectsClient({
	apiBaseUrl,
	fetchFn = fetch,
}: AdminProjectsClientOptions): AdminProjectsClient {
	return {
		async assignMember(accessToken, projectId, userId) {
			const response = await fetchFn(
				getRequestUrl(apiBaseUrl, `/projects/${projectId}/assignments`),
				{
					body: JSON.stringify({ userId }),
					headers: {
						Authorization: `Bearer ${accessToken}`,
						'Content-Type': 'application/json',
					},
					method: 'POST',
				},
			);

			if (!response.ok) {
				throw new Error(await getResponseErrorMessage(response));
			}
		},

		createProject(accessToken, input) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				body: createProjectSchema.parse(input),
				fetchFn,
				method: 'POST',
				path: '/projects',
				responseSchema: projectResponseSchema,
			});
		},

		getManagementSummary(accessToken) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				fetchFn,
				path: '/projects/management-summary',
				responseSchema: managementProjectSummaryResponseSchema,
			});
		},

		listMembers(accessToken) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				fetchFn,
				path: '/members',
				responseSchema: workspaceMemberListResponseSchema,
			});
		},

		listProjects(accessToken) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				fetchFn,
				path: '/projects',
				responseSchema: projectListResponseSchema,
			});
		},

		async removeAssignment(accessToken, projectId, userId) {
			const response = await fetchFn(
				getRequestUrl(
					apiBaseUrl,
					`/projects/${projectId}/assignments/${userId}`,
				),
				{
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
					method: 'DELETE',
				},
			);

			if (!response.ok) {
				throw new Error(await getResponseErrorMessage(response));
			}
		},

		updateProject(accessToken, projectId, input) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				body: updateProjectSchema.parse(input),
				fetchFn,
				method: 'PATCH',
				path: `/projects/${projectId}`,
				responseSchema: projectResponseSchema,
			});
		},
	};
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const adminProjectsClient = createAdminProjectsClient({
	apiBaseUrl,
	fetchFn: fetch,
});
