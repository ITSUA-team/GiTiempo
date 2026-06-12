import {
	updateWorkspaceSettingsSchema,
	workspaceSettingsResponseSchema,
	type UpdateWorkspaceInput,
	type UpdateWorkspaceSettingsInput,
	type WorkspaceResponse,
	type WorkspaceSettingsResponse,
} from '@gitiempo/shared';
import { createWorkspaceClient } from '@gitiempo/web-shared';
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from '@/services/api-client';

interface AdminSettingsClientOptions {
	apiClient: Pick<AuthenticatedApiClient, 'requestJson'>;
}

/* eslint-disable no-unused-vars */

export interface AdminSettingsClient {
	getWorkspace(): Promise<WorkspaceResponse>;
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
		getWorkspace() {
			return workspaceClient.getWorkspace();
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

function createDefaultAdminSettingsClient(): AdminSettingsClient {
	return createAdminSettingsClient({
		apiClient: getAuthenticatedAppApiClient(),
	});
}

export const adminSettingsClient: AdminSettingsClient = {
	getWorkspace() {
		return createDefaultAdminSettingsClient().getWorkspace();
	},
	getWorkspaceSettings() {
		return createDefaultAdminSettingsClient().getWorkspaceSettings();
	},
	updateWorkspace(input) {
		return createDefaultAdminSettingsClient().updateWorkspace(input);
	},
	updateWorkspaceSettings(input) {
		return createDefaultAdminSettingsClient().updateWorkspaceSettings(input);
	},
};
