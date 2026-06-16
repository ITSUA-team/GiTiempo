import type {
  GitHubIssue,
  GitHubProject,
  GitHubProjectIssueItem,
  GitHubRepository,
  MaterializeGitHubIssueTimerTargetInput,
  ProjectResponse,
  TaskResponse,
} from "@gitiempo/shared";

export interface WorkspaceProjectOption {
  id: string;
  kind: "workspace-project";
  name: string;
  project: ProjectResponse;
  sourceLabel: "Workspace";
}

export interface GitHubRepositorySourceOption {
  githubRepo: string;
  id: string;
  kind: "github-repository";
  name: string;
  owner: string;
  repo: string;
  sourceLabel: "GitHub repository";
}

export interface GitHubProjectSourceOption {
  githubProjectId: string;
  id: string;
  kind: "github-project";
  name: string;
  owner: string;
  sourceLabel: "GitHub Project";
}

export type TopBarProjectOption =
  | WorkspaceProjectOption
  | GitHubRepositorySourceOption
  | GitHubProjectSourceOption;

export interface WorkspaceTaskOption {
  githubIssue: TaskResponse["githubIssue"];
  id: string;
  isActive: boolean;
  kind: "workspace-task";
  projectId: string;
  status: TaskResponse["status"];
  task: TaskResponse;
  title: string;
}

export interface GitHubIssueTaskOption {
  githubRepo: string;
  id: string;
  issueNumber: number;
  issueTitle: string;
  kind: "github-issue";
  sourceType: "repository" | "project";
  title: string;
  githubProjectId?: string;
  githubProjectItemId?: string;
}

export type TopBarTaskOption = WorkspaceTaskOption | GitHubIssueTaskOption;

export function toWorkspaceProjectOption(
  project: ProjectResponse,
): WorkspaceProjectOption {
  return {
    id: project.id,
    kind: "workspace-project",
    name: project.name,
    project,
    sourceLabel: "Workspace",
  };
}

export function toWorkspaceTaskOption(task: TaskResponse): WorkspaceTaskOption {
  return {
    githubIssue: task.githubIssue,
    id: task.id,
    isActive: task.isActive,
    kind: "workspace-task",
    projectId: task.projectId,
    status: task.status,
    task,
    title: task.title,
  };
}

export function toGitHubRepositorySourceOption(
  repository: GitHubRepository,
): GitHubRepositorySourceOption {
  return {
    githubRepo: repository.fullName,
    id: `github-repository:${repository.fullName}`,
    kind: "github-repository",
    name: `GitHub repo: ${repository.fullName}`,
    owner: repository.owner,
    repo: repository.name,
    sourceLabel: "GitHub repository",
  };
}

export function toGitHubProjectSourceOption(
  project: GitHubProject,
): GitHubProjectSourceOption {
  return {
    githubProjectId: project.id,
    id: `github-project:${project.id}`,
    kind: "github-project",
    name: `GitHub project: ${project.owner} / ${project.title}`,
    owner: project.owner,
    sourceLabel: "GitHub Project",
  };
}

export function toRepositoryIssueTaskOption(
  source: GitHubRepositorySourceOption,
  issue: GitHubIssue,
): GitHubIssueTaskOption {
  return {
    githubRepo: issue.repository.fullName,
    id: `${source.id}:issue:${issue.repository.fullName}#${issue.number}`,
    issueNumber: issue.number,
    issueTitle: issue.title,
    kind: "github-issue",
    sourceType: "repository",
    title: `#${issue.number} ${issue.title}`,
  };
}

export function toProjectIssueTaskOption(
  source: GitHubProjectSourceOption,
  item: GitHubProjectIssueItem,
): GitHubIssueTaskOption {
  return {
    githubProjectId: source.githubProjectId,
    githubProjectItemId: item.projectItemId,
    githubRepo: item.issue.repository.fullName,
    id: `${source.id}:item:${item.projectItemId}`,
    issueNumber: item.issue.number,
    issueTitle: item.issue.title,
    kind: "github-issue",
    sourceType: "project",
    title: `#${item.issue.number} ${item.issue.title}`,
  };
}

export function toGitHubIssueTimerTargetInput(
  option: GitHubIssueTaskOption,
): MaterializeGitHubIssueTimerTargetInput {
  if (option.sourceType === "project") {
    return {
      githubProjectId: option.githubProjectId!,
      githubProjectItemId: option.githubProjectItemId!,
      githubRepo: option.githubRepo,
      issueNumber: option.issueNumber,
      issueTitle: option.issueTitle,
      sourceType: "project",
    };
  }

  return {
    githubRepo: option.githubRepo,
    issueNumber: option.issueNumber,
    issueTitle: option.issueTitle,
    sourceType: "repository",
  };
}

export function isWorkspaceProjectOption(
  option: TopBarProjectOption | null,
): option is WorkspaceProjectOption {
  return option?.kind === "workspace-project";
}

export function isGitHubProjectSourceOption(
  option: TopBarProjectOption | null,
): option is GitHubProjectSourceOption {
  return option?.kind === "github-project";
}

export function isGitHubRepositorySourceOption(
  option: TopBarProjectOption | null,
): option is GitHubRepositorySourceOption {
  return option?.kind === "github-repository";
}

export function isWorkspaceTaskOption(
  option: TopBarTaskOption | null,
): option is WorkspaceTaskOption {
  return option?.kind === "workspace-task";
}

export function isGitHubIssueTaskOption(
  option: TopBarTaskOption | null,
): option is GitHubIssueTaskOption {
  return option?.kind === "github-issue";
}
