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

import { appEnv } from '@/config/env';

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

function createDefaultAdminSettingsClient(): AdminSettingsClient {
	return createAdminSettingsClient({
		apiBaseUrl: appEnv.apiBaseUrl,
		fetchFn: fetch,
	});
}

export const adminSettingsClient: AdminSettingsClient = {
	getWorkspace(accessToken) {
		return createDefaultAdminSettingsClient().getWorkspace(accessToken);
	},
	getWorkspaceSettings(accessToken) {
		return createDefaultAdminSettingsClient().getWorkspaceSettings(accessToken);
	},
	updateWorkspace(accessToken, input) {
		return createDefaultAdminSettingsClient().updateWorkspace(accessToken, input);
	},
	updateWorkspaceSettings(accessToken, input) {
		return createDefaultAdminSettingsClient().updateWorkspaceSettings(accessToken, input);
	},
};
