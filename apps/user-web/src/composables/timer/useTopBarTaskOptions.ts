import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueryClient } from "@tanstack/vue-query";
import { ref, type ComputedRef } from "vue";

import { getGitHubIssueTaskOptionId } from "@/lib/top-bar-timer-helpers";
import { timerKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import type {
  GitHubIssueTaskOption,
  TopBarTaskOption,
  TopBarTaskPicker,
} from "./useTopBarTaskPicker";

interface UseTopBarTaskOptionsOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  picker: TopBarTaskPicker;
  scope: ComputedRef<UserServerStateScope>;
}

export function useTopBarTaskOptions({
  accessToken,
  client,
  picker,
  scope,
}: UseTopBarTaskOptionsOptions) {
  const queryClient = useQueryClient();
  const isLoadingProjects = ref(false);
  const isLoadingTasks = ref(false);
  let taskRequestId = 0;

  async function ensureProjectsLoaded(): Promise<ProjectResponse[]> {
    if (picker.projects.value.length > 0) {
      return picker.projects.value;
    }

    if (!accessToken.value) {
      throw new Error("Authentication is required to load visible projects.");
    }

    isLoadingProjects.value = true;
    picker.setProjectsError(null);

    try {
      const projects = await queryClient.ensureQueryData({
        queryKey: timerKeys.visibleProjects(scope.value),
        queryFn: () => client.listVisibleProjects(),
      });

      picker.setProjects(projects);
      return picker.projects.value;
    } catch (error) {
      picker.setProjectsError(getErrorMessage(error));
      throw error;
    } finally {
      isLoadingProjects.value = false;
    }
  }

  async function loadTasksForProject(projectId: string): Promise<TopBarTaskOption[]> {
    const requestId = ++taskRequestId;

    if (!accessToken.value) {
      throw new Error("Authentication is required to load project tasks.");
    }

    isLoadingTasks.value = true;
    picker.setTasksError(null);

    try {
      const cachedTasks = picker.getCachedTasks(projectId);

      if (cachedTasks) {
        picker.setTasks(cachedTasks);
        return cachedTasks;
      }

      const localTasks = await queryClient.ensureQueryData({
        queryKey: timerKeys.projectTasks(scope.value, projectId),
        queryFn: () => client.listProjectTasks(projectId),
      });
      const nextTasks = await appendGitHubIssueOptions(projectId, localTasks);

      if (requestId !== taskRequestId) {
        return picker.tasks.value;
      }

      picker.setCachedTasks(projectId, nextTasks);
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

  async function appendGitHubIssueOptions(
    projectId: string,
    localTasks: TaskResponse[],
  ): Promise<TopBarTaskOption[]> {
    const project = picker.projects.value.find(
      (candidate) => candidate.id === projectId,
    );

    if (!project || project.source !== "github") {
      return localTasks;
    }

    const repo = parseGitHubRepositoryProject(project);
    if (!repo) {
      return localTasks;
    }

    try {
      const response = await client.listGitHubRepositoryIssues(repo.owner, repo.name, {
        limit: 30,
        state: "open",
      });
      const syncedLocalIssues = new Set(
        localTasks
          .map((task) => task.githubIssue)
          .filter((issue) => issue !== null)
          .map((issue) => `${issue.githubRepo.toLowerCase()}#${issue.issueNumber}`),
      );
      const githubOptions: GitHubIssueTaskOption[] = response.items
        .filter(
          (issue) =>
            !syncedLocalIssues.has(
              `${issue.repository.fullName.toLowerCase()}#${issue.number}`,
            ),
        )
        .map((issue) => ({
          createdAt: issue.updatedAt,
          defaultBillableForTimeEntries: project.defaultBillableForTasks,
          githubIssue: {
            githubRepo: issue.repository.fullName,
            issueNumber: issue.number,
          },
          id: getGitHubIssueTaskOptionId({
            githubRepo: issue.repository.fullName,
            issueNumber: issue.number,
          }),
          isActive: true,
          isGitHubIssueOption: true,
          issueTitle: issue.title,
          projectId: project.id,
          status: "open",
          title: issue.title,
          updatedAt: issue.updatedAt,
          workspaceId: project.workspaceId,
        }));

      return [...localTasks, ...githubOptions];
    } catch (error) {
      picker.setTasksError(
        `GitHub issues could not load: ${getErrorMessage(error)}`,
      );
      return localTasks;
    }
  }

  return {
    ensureProjectsLoaded,
    isLoadingProjects,
    isLoadingTasks,
    loadTasksForProject,
  };
}

function parseGitHubRepositoryProject(
  project: ProjectResponse,
): { name: string; owner: string } | null {
  const [owner, name, ...rest] = project.name.split("/");

  if (!owner || !name || rest.length > 0) {
    return null;
  }

  return { owner, name };
}
