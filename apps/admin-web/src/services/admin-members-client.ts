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
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from '@/services/api-client';

interface AdminMembersClientOptions {
	apiClient: Pick<AuthenticatedApiClient, 'requestJson' | 'requestNoContent'>;
}

/* eslint-disable no-unused-vars */

export interface AdminMembersClient {
	cancelInvite(inviteId: string): Promise<void>;
	createInvite(
		input: CreateWorkspaceInviteInput,
	): Promise<WorkspaceInviteResponse>;
	listInvites(): Promise<WorkspaceInviteListResponse>;
	listMembers(): Promise<WorkspaceMemberListResponse>;
	removeMember(memberId: string): Promise<void>;
	resendInvite(inviteId: string): Promise<WorkspaceInviteResponse>;
	updateMemberRole(
		memberId: string,
		input: UpdateWorkspaceMemberRoleInput,
	): Promise<WorkspaceMemberResponse>;
}

/* eslint-enable no-unused-vars */

export function createAdminMembersClient({
	apiClient,
}: AdminMembersClientOptions): AdminMembersClient {
	return {
		async cancelInvite(inviteId) {
			await apiClient.requestNoContent({
				method: 'DELETE',
				path: `/invites/${inviteId}`,
			});
		},

		createInvite(input) {
			return apiClient.requestJson({
				body: createWorkspaceInviteSchema.parse(input),
				method: 'POST',
				path: '/invites',
				responseSchema: workspaceInviteResponseSchema,
			});
		},

		listInvites() {
			return apiClient.requestJson({
				path: '/invites',
				responseSchema: workspaceInviteListResponseSchema,
			});
		},

		listMembers() {
			return apiClient.requestJson({
				path: '/members',
				responseSchema: workspaceMemberListResponseSchema,
			});
		},

		async removeMember(memberId) {
			await apiClient.requestNoContent({
				method: 'DELETE',
				path: `/members/${memberId}`,
			});
		},

		resendInvite(inviteId) {
			return apiClient.requestJson({
				method: 'POST',
				path: `/invites/${inviteId}/resend`,
				responseSchema: workspaceInviteResponseSchema,
			});
		},

		updateMemberRole(memberId, input) {
			return apiClient.requestJson({
				body: updateWorkspaceMemberRoleSchema.parse(input),
				method: 'PATCH',
				path: `/members/${memberId}/role`,
				responseSchema: workspaceMemberResponseSchema,
			});
		},
	};
}

function createDefaultAdminMembersClient(): AdminMembersClient {
	return createAdminMembersClient({
		apiClient: getAuthenticatedAppApiClient(),
	});
}

export const adminMembersClient: AdminMembersClient = {
	cancelInvite(inviteId) {
		return createDefaultAdminMembersClient().cancelInvite(inviteId);
	},
	createInvite(input) {
		return createDefaultAdminMembersClient().createInvite(input);
	},
	listInvites() {
		return createDefaultAdminMembersClient().listInvites();
	},
	listMembers() {
		return createDefaultAdminMembersClient().listMembers();
	},
	removeMember(memberId) {
		return createDefaultAdminMembersClient().removeMember(memberId);
	},
	resendInvite(inviteId) {
		return createDefaultAdminMembersClient().resendInvite(inviteId);
	},
	updateMemberRole(memberId, input) {
		return createDefaultAdminMembersClient().updateMemberRole(
			memberId,
			input,
		);
	},
};
