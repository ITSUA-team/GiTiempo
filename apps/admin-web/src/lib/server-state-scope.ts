import { computed, type Ref } from 'vue';
import { readAccessTokenServerStateScope } from '@gitiempo/web-shared/query';

import type { AdminServerStateScope } from './query-keys';

export function getAdminServerStateScope(
  accessToken: string | null | undefined,
): AdminServerStateScope {
  const scope = readAccessTokenServerStateScope(accessToken);

  return {
    role: scope.role,
    userId: scope.userId,
    workspaceId: scope.workspaceId,
  };
}

export function useInvoiceServerScope(accessToken: Ref<string | null | undefined>) {
  return computed<AdminServerStateScope>(previous => {
    const next = getAdminServerStateScope(accessToken.value);
    return previous && previous.role === next.role && previous.userId === next.userId && previous.workspaceId === next.workspaceId
      ? previous
      : next;
  });
}
