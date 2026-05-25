import { useQuery } from "@tanstack/vue-query";
import type { TaskResponse } from "@gitiempo/shared";
import { computed, toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";
import { isQueryEnabled, type QueryAccessOptions } from "../query-options";

/* eslint-disable no-unused-vars */
interface ProjectTasksClient {
  listProjectTasks(accessToken: string, projectId: string): Promise<TaskResponse[]>;
}
/* eslint-enable no-unused-vars */

interface UseProjectTasksQueryOptions extends QueryAccessOptions {
  client: ProjectTasksClient;
  projectId: MaybeRefOrGetter<string | null | undefined>;
}

function requireProjectId(projectId: string | null | undefined): string {
  if (!projectId) {
    throw new Error("Project is required to load tasks.");
  }

  return projectId;
}

export const useProjectTasksQuery = (options: UseProjectTasksQueryOptions) =>
  useQuery({
    queryKey: computed(() => ["project_tasks", toValue(options.projectId) ?? null]),
    enabled: computed(() => isQueryEnabled(options) && Boolean(toValue(options.projectId))),
    queryFn: () =>
      options.client.listProjectTasks(
        requireAccessToken(toValue(options.accessToken)),
        requireProjectId(toValue(options.projectId)),
      ),
  });
