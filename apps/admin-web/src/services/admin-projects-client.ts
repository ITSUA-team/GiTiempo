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
import {
  getDefaultFetchFn,
	getRequestUrl,
	getResponseErrorMessage,
	requestJson,
} from '@gitiempo/web-shared/http';

import { appEnv } from '@/config/env';

/* eslint-disable no-unused-vars */

interface AdminProjectsClientOptions {
	apiBaseUrl: string | undefined;
	fetchFn?: typeof fetch;
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
	fetchFn = getDefaultFetchFn(),
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

function createDefaultAdminProjectsClient(): AdminProjectsClient {
	return createAdminProjectsClient({
		apiBaseUrl: appEnv.apiBaseUrl,
	});
}

export const adminProjectsClient: AdminProjectsClient = {
	assignMember(accessToken, projectId, userId) {
		return createDefaultAdminProjectsClient().assignMember(
			accessToken,
			projectId,
			userId,
		);
	},
	createProject(accessToken, input) {
		return createDefaultAdminProjectsClient().createProject(accessToken, input);
	},
	getManagementSummary(accessToken) {
		return createDefaultAdminProjectsClient().getManagementSummary(accessToken);
	},
	listProjects(accessToken) {
		return createDefaultAdminProjectsClient().listProjects(accessToken);
	},
	removeAssignment(accessToken, projectId, userId) {
		return createDefaultAdminProjectsClient().removeAssignment(
			accessToken,
			projectId,
			userId,
		);
	},
	updateProject(accessToken, projectId, input) {
		return createDefaultAdminProjectsClient().updateProject(
			accessToken,
			projectId,
			input,
		);
	},
};
