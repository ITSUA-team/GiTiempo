import {
	addWorkspaceGitHubOrganizationSchema,
	githubInstallationCompleteRequestSchema,
	githubInstallationSetupRequestSchema,
	githubInstallationSetupResponseSchema,
	githubConnectionStatusResponseSchema,
	githubOwnerListResponseSchema,
	updateWorkspaceSettingsSchema,
	workspaceGitHubOrganizationListResponseSchema,
	workspaceGitHubOrganizationResponseSchema,
	workspaceGitHubInstallationListSchema,
	workspaceGitHubInstallationSchema,
	workspaceSettingsResponseSchema,
	type AddWorkspaceGitHubOrganizationInput,
	type GitHubInstallationCompleteRequest,
	type GitHubInstallationSetupRequest,
	type GitHubInstallationSetupResponse,
	type GitHubConnectionStatusResponse,
	type GitHubOwnerListResponse,
	type UpdateWorkspaceInput,
	type UpdateWorkspaceSettingsInput,
	type WorkspaceGitHubOrganizationListResponse,
	type WorkspaceGitHubOrganizationResponse,
	type WorkspaceGitHubInstallation,
	type WorkspaceGitHubInstallationList,
	type WorkspaceResponse,
	type WorkspaceSettingsResponse,
} from '@gitiempo/shared';
import { createWorkspaceClient } from '@gitiempo/web-shared';
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from '@/services/api-client';

interface AdminSettingsClientOptions {
	apiClient: Pick<AuthenticatedApiClient, 'requestJson' | 'requestNoContent'>;
}


export interface AdminSettingsClient {
	addWorkspaceGitHubOrganization(
		input: AddWorkspaceGitHubOrganizationInput,
	): Promise<WorkspaceGitHubOrganizationResponse>;
	completeWorkspaceGitHubInstallation(
		input: GitHubInstallationCompleteRequest,
	): Promise<WorkspaceGitHubInstallation>;
	getGitHubConnectionStatus(): Promise<GitHubConnectionStatusResponse>;
	getWorkspace(): Promise<WorkspaceResponse>;
	listAvailableGitHubOrganizations(): Promise<GitHubOwnerListResponse>;
  listWorkspaceGitHubOrganizations(): Promise<WorkspaceGitHubOrganizationListResponse>;
  listWorkspaceGitHubInstallations(): Promise<WorkspaceGitHubInstallationList>;
  removeWorkspaceGitHubOrganization(organizationId: string): Promise<void>;
	setupWorkspaceGitHubInstallation(
		input: GitHubInstallationSetupRequest,
	): Promise<GitHubInstallationSetupResponse>;
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

		completeWorkspaceGitHubInstallation(input) {
			return apiClient.requestJson({
				body: githubInstallationCompleteRequestSchema.parse(input),
				method: 'POST',
				path: '/workspace/github/installations/complete',
				responseSchema: workspaceGitHubInstallationSchema,
			});
		},

		getGitHubConnectionStatus() {
			return apiClient.requestJson({
				path: '/github/connection',
				responseSchema: githubConnectionStatusResponseSchema,
			});
		},

		getWorkspace() {
			return workspaceClient.getWorkspace();
		},

		listAvailableGitHubOrganizations() {
			return apiClient.requestJson({
				path: '/github/organizations',
				responseSchema: githubOwnerListResponseSchema,
			});
		},

		listWorkspaceGitHubOrganizations() {
			return apiClient.requestJson({
				path: '/workspace/github/organizations',
				responseSchema: workspaceGitHubOrganizationListResponseSchema,
			});
		},

		listWorkspaceGitHubInstallations() {
			return apiClient.requestJson({
				path: '/workspace/github/installations',
				responseSchema: workspaceGitHubInstallationListSchema,
			});
		},

		async removeWorkspaceGitHubOrganization(organizationId) {
			await apiClient.requestNoContent({
				method: 'DELETE',
				path: `/workspace/github/organizations/${organizationId}`,
			});
		},

		setupWorkspaceGitHubInstallation(input) {
			return apiClient.requestJson({
				body: githubInstallationSetupRequestSchema.parse(input),
				method: 'POST',
				path: '/workspace/github/installations/setup',
				responseSchema: githubInstallationSetupResponseSchema,
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
