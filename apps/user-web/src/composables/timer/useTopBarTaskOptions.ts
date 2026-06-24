import type {
  GitHubIssue,
  GitHubIssueListQuery,
  GitHubOwnerListQuery,
  ProjectResponse,
  TaskResponse,
} from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueryClient } from "@tanstack/vue-query";
import { ref, type ComputedRef } from "vue";

import {
  githubBrowsingKeys,
  timerKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
import { createTopBarTimerGitHubProposalId } from "@/lib/top-bar-timer-helpers";
import type { GitHubBrowsingClient } from "@/services/github-browsing-client";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import type {
  TopBarGitHubTaskProposal,
  TopBarTaskPicker,
} from "./useTopBarTaskPicker";

const GITHUB_REPO_PATTERN = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;
const GITHUB_PROPOSAL_QUERY = {
  limit: 10,
  state: "open",
} satisfies Partial<GitHubIssueListQuery>;
const GITHUB_OWNER_QUERY = {
  type: "all",
} satisfies Partial<GitHubOwnerListQuery>;

interface GitHubRepositoryContext {
  fullName: string;
  owner: string;
  repo: string;
}

interface UseTopBarTaskOptionsOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  githubClient: GitHubBrowsingClient;
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
  const isLoadingProjects = ref(false);
  const isLoadingTasks = ref(false);
  const isLoadingGitHubTaskProposals = ref(false);
  let taskRequestId = 0;
  let gitHubProposalRequestId = 0;

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

  async function loadTasksForProject(projectId: string): Promise<TaskResponse[]> {
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

      const nextTasks = await queryClient.ensureQueryData({
        queryKey: timerKeys.projectTasks(scope.value, projectId),
        queryFn: () => client.listProjectTasks(projectId),
      });

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

  async function loadGitHubIssueProposalsForProject(
    project: ProjectResponse | null,
  ): Promise<TopBarGitHubTaskProposal[]> {
    const requestId = ++gitHubProposalRequestId;
    const repository = readGitHubRepositoryContext(project);

    if (!repository) {
      isLoadingGitHubTaskProposals.value = false;
      picker.setGitHubIssueProposals([]);
      picker.setGitHubProposalError(null);
      return [];
    }

    isLoadingGitHubTaskProposals.value = true;
    picker.setGitHubProposalError(null);

    try {
      if (!accessToken.value) {
        throw new Error("Authentication is required to load GitHub issue suggestions.");
      }

      const owners = await githubClient.listOwners(GITHUB_OWNER_QUERY);

      if (!isBrowseableGitHubOwner(repository.owner, owners.items)) {
        picker.setGitHubIssueProposals([]);
        picker.setGitHubProposalError(null);
        return [];
      }

      const cacheKey = buildGitHubProposalCacheKey(repository.fullName);
      const cachedProposals = picker.getCachedGitHubIssueProposals(cacheKey);

      if (cachedProposals) {
        const proposals = filterGitHubTaskProposals(
          cachedProposals,
          picker.activeTasks.value,
        );

        picker.setGitHubIssueProposals(proposals);
        return proposals;
      }

      const response = await queryClient.ensureQueryData({
        queryKey: githubBrowsingKeys.repositoryIssues(
          scope.value,
          repository.fullName,
          GITHUB_PROPOSAL_QUERY,
        ),
        queryFn: () =>
          githubClient.listRepositoryIssues(
            repository.owner,
            repository.repo,
            GITHUB_PROPOSAL_QUERY,
          ),
      });
      const fetchedProposals = response.items.map(toGitHubTaskProposal);
      const proposals = filterGitHubTaskProposals(
        fetchedProposals,
        picker.activeTasks.value,
      );

      if (requestId !== gitHubProposalRequestId) {
        return picker.gitHubIssueProposals.value;
      }

      picker.setCachedGitHubIssueProposals(cacheKey, fetchedProposals);
      picker.setGitHubIssueProposals(proposals);
      return proposals;
    } catch (error) {
      if (requestId === gitHubProposalRequestId) {
        picker.setGitHubIssueProposals([]);
        picker.setGitHubProposalError(getErrorMessage(error));
      }

      return [];
    } finally {
      if (requestId === gitHubProposalRequestId) {
        isLoadingGitHubTaskProposals.value = false;
      }
    }
  }

  function readGitHubRepositoryContext(
    project: ProjectResponse | null,
  ): GitHubRepositoryContext | null {
    if (!project || project.source !== "github") {
      return null;
    }

    const match = project.name.trim().match(GITHUB_REPO_PATTERN);

    if (!match) {
      return null;
    }

    const [, owner, repo] = match;

    if (!owner || !repo) {
      return null;
    }

    return {
      fullName: `${owner}/${repo}`,
      owner,
      repo,
    };
  }

  function hasExistingGitHubTask(
    issue: GitHubIssue,
    tasks: TaskResponse[],
  ): boolean {
    return tasks.some((task) => {
      const taskIssue = task.githubIssue;

      return (
        taskIssue !== null &&
        taskIssue.githubRepo.toLowerCase() === issue.repository.fullName.toLowerCase() &&
        taskIssue.issueNumber === issue.number
      );
    });
  }

  function filterGitHubTaskProposals(
    proposals: TopBarGitHubTaskProposal[],
    tasks: TaskResponse[],
  ): TopBarGitHubTaskProposal[] {
    return proposals.filter(
      (proposal) => !hasExistingGitHubTask(proposal.issue, tasks),
    );
  }

  function isBrowseableGitHubOwner(
    ownerLogin: string,
    owners: Array<{ login: string }>,
  ): boolean {
    const normalizedOwner = ownerLogin.toLowerCase();

    return owners.some((owner) => owner.login.toLowerCase() === normalizedOwner);
  }

  function toGitHubTaskProposal(issue: GitHubIssue): TopBarGitHubTaskProposal {
    const repositoryLabel = issue.repository.fullName;

    return {
      id: createTopBarTimerGitHubProposalId(repositoryLabel, issue.number),
      isGitHubIssueProposal: true,
      issue,
      repositoryLabel,
      title: issue.title,
    };
  }

  function buildGitHubProposalCacheKey(repositoryFullName: string): string {
    return [
      scope.value.userId ?? "anonymous-user",
      scope.value.workspaceId ?? "anonymous-workspace",
      repositoryFullName.toLowerCase(),
    ].join(":");
  }

  return {
    ensureProjectsLoaded,
    isLoadingGitHubTaskProposals,
    isLoadingProjects,
    isLoadingTasks,
    loadGitHubIssueProposalsForProject,
    loadTasksForProject,
  };
}
