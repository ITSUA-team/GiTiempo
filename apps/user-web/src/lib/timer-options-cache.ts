import type { QueryClient } from "@tanstack/vue-query";

import { loadOrganizationGitHubProjects } from "@/lib/timer-github-projects";
import {
  timerGithubKeys,
  userProjectsKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
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
    queryKey: userProjectsKeys.visibleProjects(scope),
    queryFn: () => client.listVisibleProjects(),
    staleTime: TIMER_OPTIONS_STALE_TIME,
  });

  const githubProjects = queryClient.prefetchQuery({
    queryKey: timerGithubKeys.boards(scope),
    queryFn: () => loadOrganizationGitHubProjects({ client }),
    staleTime: TIMER_OPTIONS_STALE_TIME,
  });

  await Promise.allSettled([projects, githubProjects]);
}
