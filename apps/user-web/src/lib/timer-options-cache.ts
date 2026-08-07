import type { QueryClient } from "@tanstack/vue-query";

import {
  loadGitHubProjectRepositories,
  loadOrganizationGitHubProjects,
} from "@/lib/timer-github-projects";
import { timerKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

export const TIMER_OPTIONS_STALE_TIME = 5 * 60 * 1000;

export interface PrefetchTimerOptionsInput {
  client: TimeEntriesClient;
  queryClient: QueryClient;
  scope: UserServerStateScope;
}

export async function prefetchTimerOptions({
  client,
  queryClient,
  scope,
}: PrefetchTimerOptionsInput): Promise<void> {
  const projects = queryClient.prefetchQuery({
    queryKey: timerKeys.visibleProjects(scope),
    queryFn: () => client.listVisibleProjects(),
    staleTime: TIMER_OPTIONS_STALE_TIME,
  });

  const githubProjects = queryClient
    .fetchQuery({
      queryKey: timerKeys.githubProjects(scope),
      queryFn: () => loadOrganizationGitHubProjects({ client }),
      staleTime: TIMER_OPTIONS_STALE_TIME,
    })
    .then(async (result) => {
      if (result.projects.length === 0) {
        return;
      }

      await queryClient.prefetchQuery({
        queryKey: timerKeys.githubProjectRepositories(scope),
        queryFn: () =>
          loadGitHubProjectRepositories({ client, projects: result.projects }),
        staleTime: TIMER_OPTIONS_STALE_TIME,
      });
    });

  await Promise.allSettled([projects, githubProjects]);
}
