import { useQuery } from "@tanstack/vue-query";
import type { ProjectResponse } from "@gitiempo/shared";
import { computed, toValue } from "vue";

import { requireAccessToken } from "../access-token";
import { projectQueryKeys } from "../keys";
import { isQueryEnabled, type QueryAccessOptions } from "../query-options";

/* eslint-disable no-unused-vars */
interface VisibleProjectsClient {
  listVisibleProjects(accessToken: string): Promise<ProjectResponse[]>;
}
/* eslint-enable no-unused-vars */

interface UseVisibleProjectsQueryOptions extends QueryAccessOptions {
  client: VisibleProjectsClient;
}

export const useVisibleProjectsQuery = (options: UseVisibleProjectsQueryOptions) =>
  useQuery({
    queryKey: projectQueryKeys.visibleProjects,
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.listVisibleProjects(
        requireAccessToken(toValue(options.accessToken)),
      ),
  });
