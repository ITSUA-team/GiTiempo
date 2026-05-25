import { useQuery } from '@tanstack/vue-query';
import type { ProjectListResponse } from '@gitiempo/shared';
import { computed, toValue } from 'vue';

import { requireAccessToken } from '../access-token';
import { projectQueryKeys } from '../keys';
import { isQueryEnabled, type QueryAccessOptions } from '../query-options';

/* eslint-disable no-unused-vars */
interface AdminProjectsClient {
  listProjects(accessToken: string): Promise<ProjectListResponse>;
}
/* eslint-enable no-unused-vars */

interface UseAdminProjectsQueryOptions extends QueryAccessOptions {
  client: AdminProjectsClient;
}

export const useAdminProjectsQuery = (options: UseAdminProjectsQueryOptions) =>
  useQuery({
    queryKey: projectQueryKeys.adminProjects,
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.listProjects(
        requireAccessToken(toValue(options.accessToken)),
      ),
  });
