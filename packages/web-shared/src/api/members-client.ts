import {
  workspaceMemberListResponseSchema,
  type WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { requestJson } from '../http';

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
  return {
    async listMembers(accessToken) {
      return requestJson({
        fetchFn,
        apiBaseUrl,
        path: '/members',
        responseSchema: workspaceMemberListResponseSchema,
        accessToken,
      });
    },
  };
}
