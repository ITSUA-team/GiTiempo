import { useQuery } from "@tanstack/vue-query";
import type { WorkspaceMemberListResponse } from "@gitiempo/shared";
import { computed, toValue } from "vue";

import { requireAccessToken } from "./access-token";
import { isQueryEnabled, type QueryAccessOptions } from "./query-options";

/* eslint-disable no-unused-vars */
interface WorkspaceMembersClient {
  listMembers(accessToken: string): Promise<WorkspaceMemberListResponse>;
}
/* eslint-enable no-unused-vars */

interface UseWorkspaceMembersQueryOptions extends QueryAccessOptions {
  client: WorkspaceMembersClient;
}

export const useWorkspaceMembersQuery = (options: UseWorkspaceMembersQueryOptions) =>
  useQuery({
    queryKey: ["workspace_members"],
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.listMembers(requireAccessToken(toValue(options.accessToken))),
  });
