import {
	updateWorkspaceSchema,
	updateWorkspaceSettingsSchema,
	workspaceResponseSchema,
	workspaceSettingsResponseSchema,
	type UpdateWorkspaceInput,
	type UpdateWorkspaceSettingsInput,
	type WorkspaceResponse,
	type WorkspaceSettingsResponse,
} from '@gitiempo/shared';
import { requestJson } from '@gitiempo/web-shared/http';

interface AdminSettingsClientOptions {
	apiBaseUrl: string | undefined;
	fetchFn: typeof fetch;
}

/* eslint-disable no-unused-vars */

export interface AdminSettingsClient {
	getWorkspace(accessToken: string): Promise<WorkspaceResponse>;
	getWorkspaceSettings(accessToken: string): Promise<WorkspaceSettingsResponse>;
	updateWorkspace(
		accessToken: string,
		input: UpdateWorkspaceInput,
	): Promise<WorkspaceResponse>;
	updateWorkspaceSettings(
		accessToken: string,
		input: UpdateWorkspaceSettingsInput,
	): Promise<WorkspaceSettingsResponse>;
}

export function createAdminSettingsClient({
	apiBaseUrl,
	fetchFn = fetch,
}: AdminSettingsClientOptions): AdminSettingsClient {
	return {
		getWorkspace(accessToken) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				fetchFn,
				path: '/workspace',
				responseSchema: workspaceResponseSchema,
			});
		},

		getWorkspaceSettings(accessToken) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				fetchFn,
				path: '/workspace/settings',
				responseSchema: workspaceSettingsResponseSchema,
			});
		},

		async updateWorkspace(accessToken, input) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				body: updateWorkspaceSchema.parse(input),
				fetchFn,
				method: 'PATCH',
				path: '/workspace',
				responseSchema: workspaceResponseSchema,
			});
		},

		async updateWorkspaceSettings(accessToken, input) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				body: updateWorkspaceSettingsSchema.parse(input),
				fetchFn,
				method: 'PATCH',
				path: '/workspace/settings',
				responseSchema: workspaceSettingsResponseSchema,
			});
		},
	};
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const adminSettingsClient = createAdminSettingsClient({
	apiBaseUrl,
	fetchFn: fetch,
});
