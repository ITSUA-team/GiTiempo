import { useQuery } from "@tanstack/vue-query";
import type { WorkspaceInviteListResponse } from "@gitiempo/shared";
import { computed, toValue } from "vue";

import { requireAccessToken } from "../access-token";
import { isQueryEnabled, type QueryAccessOptions } from "../query-options";

/* eslint-disable no-unused-vars */
interface WorkspaceInvitesClient {
  listInvites(accessToken: string): Promise<WorkspaceInviteListResponse>;
}
/* eslint-enable no-unused-vars */

interface UseWorkspaceInvitesQueryOptions extends QueryAccessOptions {
  client: WorkspaceInvitesClient;
}

export const useWorkspaceInvitesQuery = (options: UseWorkspaceInvitesQueryOptions) =>
  useQuery({
    queryKey: ["workspace_invites"],
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.listInvites(requireAccessToken(toValue(options.accessToken))),
  });
