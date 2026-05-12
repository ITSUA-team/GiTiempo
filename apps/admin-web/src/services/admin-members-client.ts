import {
	createWorkspaceInviteSchema,
	updateWorkspaceMemberRoleSchema,
	workspaceInviteListResponseSchema,
	workspaceInviteResponseSchema,
	workspaceMemberListResponseSchema,
	workspaceMemberResponseSchema,
	type CreateWorkspaceInviteInput,
	type UpdateWorkspaceMemberRoleInput,
	type WorkspaceInviteListResponse,
	type WorkspaceInviteResponse,
	type WorkspaceMemberListResponse,
	type WorkspaceMemberResponse,
} from '@gitiempo/shared';
import {
	getRequestUrl,
	getResponseErrorMessage,
	requestJson,
} from '@gitiempo/web-shared/http';

interface AdminMembersClientOptions {
	apiBaseUrl: string | undefined;
	fetchFn: typeof fetch;
}

/* eslint-disable no-unused-vars */

export interface AdminMembersClient {
	createInvite(
		accessToken: string,
		input: CreateWorkspaceInviteInput,
	): Promise<WorkspaceInviteResponse>;
	listInvites(accessToken: string): Promise<WorkspaceInviteListResponse>;
	listMembers(accessToken: string): Promise<WorkspaceMemberListResponse>;
	removeMember(accessToken: string, memberId: string): Promise<void>;
	updateMemberRole(
		accessToken: string,
		memberId: string,
		input: UpdateWorkspaceMemberRoleInput,
	): Promise<WorkspaceMemberResponse>;
}

export function createAdminMembersClient({
	apiBaseUrl,
	fetchFn = fetch,
}: AdminMembersClientOptions): AdminMembersClient {
	return {
		createInvite(accessToken, input) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				body: createWorkspaceInviteSchema.parse(input),
				fetchFn,
				method: 'POST',
				path: '/invites',
				responseSchema: workspaceInviteResponseSchema,
			});
		},

		listInvites(accessToken) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				fetchFn,
				path: '/invites',
				responseSchema: workspaceInviteListResponseSchema,
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

		async removeMember(accessToken, memberId) {
			const response = await fetchFn(
				getRequestUrl(apiBaseUrl, `/members/${memberId}`),
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

		updateMemberRole(accessToken, memberId, input) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				body: updateWorkspaceMemberRoleSchema.parse(input),
				fetchFn,
				method: 'PATCH',
				path: `/members/${memberId}/role`,
				responseSchema: workspaceMemberResponseSchema,
			});
		},
	};
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const adminMembersClient = createAdminMembersClient({
	apiBaseUrl,
	fetchFn: fetch,
});
