import { useQuery } from "@tanstack/vue-query";
import type { WorkspaceResponse } from "@gitiempo/shared";
import { computed, toValue } from "vue";

import { requireAccessToken } from "./access-token";
import { isQueryEnabled, type QueryAccessOptions } from "./query-options";

/* eslint-disable no-unused-vars */
interface WorkspaceClient {
  getWorkspace(accessToken: string): Promise<WorkspaceResponse>;
}
/* eslint-enable no-unused-vars */

interface UseWorkspaceQueryOptions extends QueryAccessOptions {
  client: WorkspaceClient;
}

export const useWorkspaceQuery = (options: UseWorkspaceQueryOptions) =>
  useQuery({
    queryKey: ["workspace"],
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.getWorkspace(requireAccessToken(toValue(options.accessToken))),
  });
