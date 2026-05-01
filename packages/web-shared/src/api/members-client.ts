import {
  workspaceMemberListResponseSchema,
  type WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { getJson } from './http-helpers';

/* eslint-disable no-unused-vars */

interface MembersClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface MembersClient {
  listMembers(accessToken: string): Promise<WorkspaceMemberListResponse>;
}

/* eslint-enable no-unused-vars */

export function createMembersClient({
  apiBaseUrl,
  fetchFn = fetch,
}: MembersClientOptions = {}): MembersClient {
  const authHeaders = (accessToken: string) => ({
    Authorization: `Bearer ${accessToken}`,
  });

  return {
    async listMembers(accessToken) {
      return getJson(
        fetchFn,
        apiBaseUrl,
        '/members',
        workspaceMemberListResponseSchema,
        { headers: authHeaders(accessToken) },
      );
    },
  };
}
