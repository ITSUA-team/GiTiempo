import { useQuery } from "@tanstack/vue-query";
import type { WorkspaceSettingsResponse } from "@gitiempo/shared";
import { computed, toValue } from "vue";

import { requireAccessToken } from "./access-token";
import { isQueryEnabled, type QueryAccessOptions } from "./query-options";

/* eslint-disable no-unused-vars */
interface WorkspaceSettingsClient {
  getWorkspaceSettings(accessToken: string): Promise<WorkspaceSettingsResponse>;
}
/* eslint-enable no-unused-vars */

interface UseWorkspaceSettingsQueryOptions extends QueryAccessOptions {
  client: WorkspaceSettingsClient;
}

export const useWorkspaceSettingsQuery = (
  options: UseWorkspaceSettingsQueryOptions,
) =>
  useQuery({
    queryKey: ["workspace_settings"],
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.getWorkspaceSettings(
        requireAccessToken(toValue(options.accessToken)),
      ),
  });
