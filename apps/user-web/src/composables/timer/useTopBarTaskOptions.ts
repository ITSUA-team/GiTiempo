import type { GitHubOwner, ProjectResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueryClient } from "@tanstack/vue-query";
import { computed, ref, type ComputedRef } from "vue";

import {
  isGitHubProjectSourceOption,
  isGitHubRepositorySourceOption,
  isWorkspaceProjectOption,
  toGitHubProjectSourceOption,
  toGitHubRepositorySourceOption,
  toProjectIssueTaskOption,
  toRepositoryIssueTaskOption,
  toWorkspaceTaskOption,
  type TopBarTaskOption,
} from "@/lib/top-bar-task-picker-options";
import { timerKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { GitHubClient } from "@/services/github-client";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import type { TopBarTaskPicker } from "./useTopBarTaskPicker";

const GITHUB_BROWSE_LIMIT = 100;
const GITHUB_SOURCES_UNAVAILABLE_MESSAGE =
  "GitHub sources are unavailable right now.";

interface UseTopBarTaskOptionsOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  githubClient: GitHubClient;
  picker: TopBarTaskPicker;
  scope: ComputedRef<UserServerStateScope>;
}

export function useTopBarTaskOptions({
  accessToken,
  client,
  githubClient,
  picker,
  scope,
}: UseTopBarTaskOptionsOptions) {
  const queryClient = useQueryClient();
  const isLoadingWorkspaceProjects = ref(false);
  const isLoadingGitHubSources = ref(false);
  const isLoadingTasks = ref(false);
  const isLoadingProjects = computed(
    () => isLoadingWorkspaceProjects.value || isLoadingGitHubSources.value,
  );
  let taskRequestId = 0;
  let hasLoadedGitHubSources = false;

  async function ensureProjectsLoaded(): Promise<ProjectResponse[]> {
    if (picker.projects.value.length > 0) {
      await ensureGitHubSourcesLoaded();
      return picker.projects.value;
    }

    if (!accessToken.value) {
      throw new Error("Authentication is required to load visible projects.");
    }

    isLoadingWorkspaceProjects.value = true;
    picker.setProjectsError(null);

    try {
      const projects = await queryClient.ensureQueryData({
        queryKey: timerKeys.visibleProjects(scope.value),
        queryFn: () => client.listVisibleProjects(),
      });

      picker.setProjects(projects);
      await ensureGitHubSourcesLoaded();
      return picker.projects.value;
    } catch (error) {
      picker.setProjectsError(getErrorMessage(error));
      throw error;
    } finally {
      isLoadingWorkspaceProjects.value = false;
    }
  }

  async function ensureGitHubSourcesLoaded(): Promise<void> {
    if (hasLoadedGitHubSources || !accessToken.value) {
      return;
    }

    isLoadingGitHubSources.value = true;
    picker.setGitHubSourcesError(null);

    try {
      const connection = await queryClient.ensureQueryData({
        queryKey: timerKeys.githubConnection(scope.value),
        queryFn: () => githubClient.getConnectionStatus(),
      });

      if (connection.status !== "connected") {
        picker.setGitHubSources([]);
        hasLoadedGitHubSources = true;
        return;
      }

      const ownersResponse = await queryClient.ensureQueryData({
        queryKey: timerKeys.githubOwners(scope.value),
        queryFn: () => githubClient.listOwners({ type: "all" }),
      });
      const sourceGroups = await Promise.all(
        ownersResponse.items.map(async (owner) => {
          const ownerQuery = getGitHubOwnerScopedQuery(owner);
          const [repositories, projects] = await Promise.all([
            queryClient.ensureQueryData({
              queryKey: timerKeys.githubRepositories(
                scope.value,
                ownerQuery.ownerType,
                ownerQuery.owner,
              ),
              queryFn: () => githubClient.listRepositories(ownerQuery),
            }),
            queryClient.ensureQueryData({
              queryKey: timerKeys.githubProjects(
                scope.value,
                ownerQuery.ownerType,
                ownerQuery.owner,
              ),
              queryFn: () => githubClient.listProjects(ownerQuery),
            }),
          ]);

          return [
            ...repositories.items.map(toGitHubRepositorySourceOption),
            ...projects.items.map(toGitHubProjectSourceOption),
          ];
        }),
      );

      picker.setGitHubSources(sourceGroups.flat());
      hasLoadedGitHubSources = true;
    } catch {
      hasLoadedGitHubSources = false;
      picker.setGitHubSources([]);
      picker.setGitHubSourcesError(GITHUB_SOURCES_UNAVAILABLE_MESSAGE);
    } finally {
      isLoadingGitHubSources.value = false;
    }
  }

  async function loadTasksForProject(projectId: string): Promise<TopBarTaskOption[]> {
    const requestId = ++taskRequestId;
    const project = picker.projectOptions.value.find(
      (option) => option.id === projectId,
    );

    if (!accessToken.value) {
      throw new Error("Authentication is required to load project tasks.");
    }

    if (!project) {
      picker.setTasks([]);
      return [];
    }

    isLoadingTasks.value = true;
    picker.setTasksError(null);

    try {
      const cachedTasks = picker.getCachedTasks(project.id);

      if (cachedTasks) {
        picker.setTasks(cachedTasks);
        return cachedTasks;
      }

      const nextTasks = await loadTasksForSource(project);

      if (requestId !== taskRequestId) {
        return picker.tasks.value;
      }

      picker.setCachedTasks(project.id, nextTasks);
      picker.setTasks(nextTasks);
      return nextTasks;
    } catch (error) {
      if (requestId === taskRequestId) {
        picker.setTasks([]);
        picker.setTasksError(getErrorMessage(error));
      }

      throw error;
    } finally {
      if (requestId === taskRequestId) {
        isLoadingTasks.value = false;
      }
    }
  }

  return {
    ensureProjectsLoaded,
    isLoadingProjects,
    isLoadingTasks,
    loadTasksForProject,
  };

  async function loadTasksForSource(
    project: NonNullable<typeof picker.selectedProject.value>,
  ): Promise<TopBarTaskOption[]> {
    if (isWorkspaceProjectOption(project)) {
      const tasks = await queryClient.ensureQueryData({
        queryKey: timerKeys.projectTasks(scope.value, project.project.id),
        queryFn: () => client.listProjectTasks(project.project.id),
      });

      return tasks.map(toWorkspaceTaskOption);
    }

    if (isGitHubRepositorySourceOption(project)) {
      const issues = await queryClient.ensureQueryData({
        queryKey: timerKeys.githubRepositoryIssues(
          scope.value,
          project.owner,
          project.repo,
        ),
        queryFn: () =>
          githubClient.listRepositoryIssues(project.owner, project.repo, {
            limit: GITHUB_BROWSE_LIMIT,
            state: "open",
          }),
      });

      return issues.items.map((issue) => toRepositoryIssueTaskOption(project, issue));
    }

    if (isGitHubProjectSourceOption(project)) {
      const issues = await queryClient.ensureQueryData({
        queryKey: timerKeys.githubProjectIssues(scope.value, project.githubProjectId),
        queryFn: () =>
          githubClient.listProjectIssues(project.githubProjectId, {
            limit: GITHUB_BROWSE_LIMIT,
            state: "open",
          }),
      });

      return issues.items
        .filter((item) => !item.isArchived && item.issue.state === "open")
        .map((item) => toProjectIssueTaskOption(project, item));
    }

    return [];
  }
}

function getGitHubOwnerScopedQuery(owner: GitHubOwner) {
  if (owner.type === "personal") {
    return {
      limit: GITHUB_BROWSE_LIMIT,
      ownerType: "personal" as const,
    };
  }

  return {
    limit: GITHUB_BROWSE_LIMIT,
    owner: owner.login,
    ownerType: "organization" as const,
  };
}
