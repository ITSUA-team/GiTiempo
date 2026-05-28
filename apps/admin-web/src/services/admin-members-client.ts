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
	getDefaultFetchFn,
	getRequestUrl,
	getResponseErrorMessage,
	requestJson,
} from '@gitiempo/web-shared/http';

interface AdminMembersClientOptions {
	apiBaseUrl: string | undefined;
	fetchFn?: typeof fetch;
}

/* eslint-disable no-unused-vars */

export interface AdminMembersClient {
	cancelInvite(accessToken: string, inviteId: string): Promise<void>;
	createInvite(
		accessToken: string,
		input: CreateWorkspaceInviteInput,
	): Promise<WorkspaceInviteResponse>;
	listInvites(accessToken: string): Promise<WorkspaceInviteListResponse>;
	listMembers(accessToken: string): Promise<WorkspaceMemberListResponse>;
	removeMember(accessToken: string, memberId: string): Promise<void>;
	resendInvite(accessToken: string, inviteId: string): Promise<WorkspaceInviteResponse>;
	updateMemberRole(
		accessToken: string,
		memberId: string,
		input: UpdateWorkspaceMemberRoleInput,
	): Promise<WorkspaceMemberResponse>;
}

async function requestNoContent({
	accessToken,
	apiBaseUrl,
	fetchFn,
	method,
	path,
}: {
	accessToken: string;
	apiBaseUrl: string | undefined;
	fetchFn: typeof fetch;
	method: string;
	path: string;
}): Promise<void> {
	const response = await fetchFn(getRequestUrl(apiBaseUrl, path), {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
		method,
	});

	if (!response.ok) {
		throw new Error(await getResponseErrorMessage(response));
	}
}

export function createAdminMembersClient({
	apiBaseUrl,
	fetchFn = getDefaultFetchFn(),
}: AdminMembersClientOptions): AdminMembersClient {
	return {
		cancelInvite(accessToken, inviteId) {
			return requestNoContent({
				accessToken,
				apiBaseUrl,
				fetchFn,
				method: 'DELETE',
				path: `/invites/${inviteId}`,
			});
		},

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

		removeMember(accessToken, memberId) {
			return requestNoContent({
				accessToken,
				apiBaseUrl,
				fetchFn,
				method: 'DELETE',
				path: `/members/${memberId}`,
			});
		},

		resendInvite(accessToken, inviteId) {
			return requestJson({
				accessToken,
				apiBaseUrl,
				fetchFn,
				method: 'POST',
				path: `/invites/${inviteId}/resend`,
				responseSchema: workspaceInviteResponseSchema,
			});
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
});
