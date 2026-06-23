import {
	addWorkspaceGitHubOrganizationSchema,
	updateWorkspaceSettingsSchema,
	workspaceGitHubOrganizationListResponseSchema,
	workspaceGitHubOrganizationResponseSchema,
	workspaceSettingsResponseSchema,
	type AddWorkspaceGitHubOrganizationInput,
	type UpdateWorkspaceInput,
	type UpdateWorkspaceSettingsInput,
	type WorkspaceGitHubOrganizationListResponse,
	type WorkspaceGitHubOrganizationResponse,
	type WorkspaceResponse,
	type WorkspaceSettingsResponse,
} from '@gitiempo/shared';
import { createWorkspaceClient } from '@gitiempo/web-shared';
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from '@/services/api-client';

interface AdminSettingsClientOptions {
	apiClient: Pick<AuthenticatedApiClient, 'requestJson' | 'requestNoContent'>;
}

/* eslint-disable no-unused-vars */

export interface AdminSettingsClient {
	addWorkspaceGitHubOrganization(
		input: AddWorkspaceGitHubOrganizationInput,
	): Promise<WorkspaceGitHubOrganizationResponse>;
	getWorkspace(): Promise<WorkspaceResponse>;
	listWorkspaceGitHubOrganizations(): Promise<WorkspaceGitHubOrganizationListResponse>;
	removeWorkspaceGitHubOrganization(organizationId: string): Promise<void>;
	getWorkspaceSettings(): Promise<WorkspaceSettingsResponse>;
	updateWorkspace(
		input: UpdateWorkspaceInput,
	): Promise<WorkspaceResponse>;
	updateWorkspaceSettings(
		input: UpdateWorkspaceSettingsInput,
	): Promise<WorkspaceSettingsResponse>;
}

export function createAdminSettingsClient({
	apiClient,
}: AdminSettingsClientOptions): AdminSettingsClient {
	const workspaceClient = createWorkspaceClient({ apiClient });

	return {
		addWorkspaceGitHubOrganization(input) {
			return apiClient.requestJson({
				body: addWorkspaceGitHubOrganizationSchema.parse(input),
				method: 'POST',
				path: '/workspace/github/organizations',
				responseSchema: workspaceGitHubOrganizationResponseSchema,
			});
		},

		getWorkspace() {
			return workspaceClient.getWorkspace();
		},

		listWorkspaceGitHubOrganizations() {
			return apiClient.requestJson({
				path: '/workspace/github/organizations',
				responseSchema: workspaceGitHubOrganizationListResponseSchema,
			});
		},

		async removeWorkspaceGitHubOrganization(organizationId) {
			await apiClient.requestNoContent({
				method: 'DELETE',
				path: `/workspace/github/organizations/${organizationId}`,
			});
		},

		getWorkspaceSettings() {
			return apiClient.requestJson({
				path: '/workspace/settings',
				responseSchema: workspaceSettingsResponseSchema,
			});
		},

		async updateWorkspace(input) {
			return workspaceClient.updateWorkspace(input);
		},

		async updateWorkspaceSettings(input) {
			return apiClient.requestJson({
				body: updateWorkspaceSettingsSchema.parse(input),
				method: 'PATCH',
				path: '/workspace/settings',
				responseSchema: workspaceSettingsResponseSchema,
			});
		},
	};
}

let defaultAdminSettingsClient: AdminSettingsClient | null = null;

export function getAdminSettingsClient(): AdminSettingsClient {
	defaultAdminSettingsClient ??= createAdminSettingsClient({
		apiClient: getAuthenticatedAppApiClient(),
	});

	return defaultAdminSettingsClient;
}
