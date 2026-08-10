import {
  type GitHubProject,
  type ProjectResponse,
  type SyncedGitHubIssue,
  type TaskResponse,
} from "@gitiempo/shared";
import { computed, ref } from "vue";

import { validateInlineNewTaskInput } from "@/lib/inline-new-task";
import type { SelectedTaskContext } from "@/lib/top-bar-timer-helpers";
import type { GitHubProjectAvailability } from "@/lib/timer-github-projects";

export interface GitHubIssueTaskOption extends TaskResponse {
  githubIssue: SyncedGitHubIssue;
  isGitHubIssueOption: true;
  issueTitle: string;
}

export interface GitHubProjectIssueTaskOption extends TaskResponse {
  githubIssue: SyncedGitHubIssue;
  isGitHubProjectIssueOption: true;
  issueTitle: string;
}

export type TopBarTaskOption =
  | GitHubIssueTaskOption
  | GitHubProjectIssueTaskOption
  | TaskResponse;

export interface GitHubProjectOption extends GitHubProject {
  isGitHubProjectOption: true;
}

export function isTopBarGitHubIssueTaskOption(
  task: TopBarTaskOption,
): task is GitHubIssueTaskOption {
  return "isGitHubIssueOption" in task && task.isGitHubIssueOption === true;
}

export function isTopBarGitHubProjectIssueTaskOption(
  task: TopBarTaskOption,
): task is GitHubProjectIssueTaskOption {
  return (
    "isGitHubProjectIssueOption" in task &&
    task.isGitHubProjectIssueOption === true
  );
}

export function useTopBarTaskPicker() {
  const projects = ref<ProjectResponse[]>([]);
  const tasks = ref<TopBarTaskOption[]>([]);
  const isDialogOpen = ref(false);
  const selectedProjectId = ref<string | null>(null);
  const selectedTaskId = ref<string | null>(null);
  const selectedContextGitHubIssue = ref<SyncedGitHubIssue | null>(null);
  const selectedDescription = ref("");
  const createTaskTitle = ref("");
  const githubProjects = ref<GitHubProjectOption[]>([]);
  const selectedGitHubProjectId = ref<string | null>(null);
  const githubProjectAvailability = ref<GitHubProjectAvailability>("available");
  const githubProjectsErrorMessage = ref<string | null>(null);
  const githubProjectsTruncated = ref(false);
  const githubProjectDraftCount = ref(0);
  const githubProjectRepositories = ref<
    Record<string, { hasMore: boolean; repositories: string[] }>
  >({});
  const projectsErrorMessage = ref<string | null>(null);
  const tasksErrorMessage = ref<string | null>(null);
  const createTaskErrorMessage = ref<string | null>(null);
  const activeProjects = computed(() => projects.value.filter((project) => project.isActive));
  const activeTasks = computed(() =>
    tasks.value.filter((task) => task.isActive && task.status === "open"),
  );
  const selectedProject = computed(
    () => activeProjects.value.find((project) => project.id === selectedProjectId.value) ?? null,
  );
  const selectedGitHubProject = computed(
    () =>
      githubProjects.value.find(
        (project) => project.id === selectedGitHubProjectId.value,
      ) ?? null,
  );
  const selectedTask = computed(
    () => activeTasks.value.find((task) => task.id === selectedTaskId.value) ?? null,
  );
  const isConfirmSelectionDisabled = computed(() => {
    if (!selectedTask.value) {
      return true;
    }

    if (selectedGitHubProject.value) {
      return !isTopBarGitHubProjectIssueTaskOption(selectedTask.value);
    }

    return !selectedProject.value;
  });
  const isCreateTaskTitleEmpty = computed(() => createTaskTitle.value.trim().length === 0);

  function setProjects(nextProjects: ProjectResponse[]): void {
    projects.value = nextProjects;
  }

  function setTasks(nextTasks: TopBarTaskOption[]): void {
    tasks.value = nextTasks;
  }

  function openTaskPicker(
    context: {
      description: string;
      githubIssue?: SyncedGitHubIssue | null;
      projectId: string;
      taskId: string;
    } | null,
  ): void {
    isDialogOpen.value = true;
    createTaskErrorMessage.value = null;
    projectsErrorMessage.value = null;
    tasksErrorMessage.value = null;
    selectedProjectId.value = context?.projectId ?? null;
    selectedGitHubProjectId.value = null;
    githubProjectDraftCount.value = 0;
    selectedTaskId.value = context?.taskId ?? null;
    selectedContextGitHubIssue.value = context?.githubIssue ?? null;
    selectedDescription.value = context?.description ?? "";
  }

  function closeDialog(): void {
    isDialogOpen.value = false;
    createTaskTitle.value = "";
    createTaskErrorMessage.value = null;
  }

  function setSelectedProjectId(projectId: string | null): void {
    if (selectedProjectId.value === projectId) {
      return;
    }

    selectedProjectId.value = projectId;
    selectedContextGitHubIssue.value = null;

    if (projectId !== null) {
      selectedGitHubProjectId.value = null;
      githubProjectDraftCount.value = 0;
    }
  }

  function setGitHubProjects(nextProjects: GitHubProjectOption[]): void {
    githubProjects.value = nextProjects;
  }

  function setSelectedGitHubProjectId(githubProjectId: string | null): void {
    if (selectedGitHubProjectId.value === githubProjectId) {
      return;
    }

    selectedGitHubProjectId.value = githubProjectId;
    githubProjectDraftCount.value = 0;
    selectedTaskId.value = null;

    if (githubProjectId !== null) {
      selectedProjectId.value = null;
      selectedContextGitHubIssue.value = null;
    }
  }

  function setGitHubProjectAvailability(
    availability: GitHubProjectAvailability,
  ): void {
    githubProjectAvailability.value = availability;
  }

  function setGitHubProjectsError(message: string | null): void {
    githubProjectsErrorMessage.value = message;
  }

  function setGitHubProjectsTruncated(isTruncated: boolean): void {
    githubProjectsTruncated.value = isTruncated;
  }

  function setGitHubProjectDraftCount(count: number): void {
    githubProjectDraftCount.value = count;
  }

  function setGitHubProjectRepositories(
    next: Record<string, { hasMore: boolean; repositories: string[] }>,
  ): void {
    githubProjectRepositories.value = next;
  }

  function setSelectedTaskId(taskId: string | null): void {
    selectedTaskId.value = taskId;
  }

  function setSelectedDescription(description: string): void {
    selectedDescription.value = description;
  }

  function setCreateTaskTitle(title: string): void {
    createTaskTitle.value = title;
    createTaskErrorMessage.value = null;
  }

  function setProjectsError(message: string | null): void {
    projectsErrorMessage.value = message;
  }

  function setTasksError(message: string | null): void {
    tasksErrorMessage.value = message;
  }

  function setCreateTaskError(message: string | null): void {
    createTaskErrorMessage.value = message;
  }

  function validateCreateTaskInput() {
    const parsed = validateInlineNewTaskInput({
      defaultBillableForTimeEntries:
        selectedProject.value?.defaultBillableForTasks ?? true,
      title: createTaskTitle.value,
    });

    if (!parsed.success) {
      createTaskErrorMessage.value = parsed.error.issues[0]?.message ?? "Task title is invalid.";
      return null;
    }

    createTaskErrorMessage.value = null;
    return parsed.data;
  }

  function getSelectedTaskContext(): SelectedTaskContext | null {
    if (
      selectedGitHubProject.value &&
      selectedTask.value &&
      isTopBarGitHubProjectIssueTaskOption(selectedTask.value)
    ) {
      return {
        githubIssue: selectedTask.value.githubIssue,
        githubProjectId: selectedGitHubProject.value.id,
        issueTitle: selectedTask.value.issueTitle,
        projectName: selectedGitHubProject.value.title,
        source: "github-project-issue",
        taskId: selectedTask.value.id,
        taskTitle: selectedTask.value.title,
      };
    }

    if (!selectedProject.value || !selectedTask.value) {
      return null;
    }

    if (isTopBarGitHubIssueTaskOption(selectedTask.value)) {
      return {
        githubIssue: selectedTask.value.githubIssue,
        issueTitle: selectedTask.value.issueTitle,
        projectId: selectedProject.value.id,
        projectName: selectedProject.value.name,
        source: "github-issue",
        taskId: selectedTask.value.id,
        taskTitle: selectedTask.value.title,
      };
    }

    return {
      githubIssue: selectedTask.value.githubIssue,
      projectId: selectedProject.value.id,
      projectName: selectedProject.value.name,
      source: "local",
      taskId: selectedTask.value.id,
      taskTitle: selectedTask.value.title,
    };
  }

  function getNormalizedDescription(): string | null {
    return selectedDescription.value.trim() === "" ? null : selectedDescription.value;
  }

  return {
    activeProjects,
    activeTasks,
    githubProjectAvailability,
    githubProjectDraftCount,
    githubProjectRepositories,
    githubProjects,
    githubProjectsErrorMessage,
    githubProjectsTruncated,
    selectedGitHubProject,
    selectedGitHubProjectId,
    setGitHubProjectAvailability,
    setGitHubProjectDraftCount,
    setGitHubProjectRepositories,
    setGitHubProjects,
    setGitHubProjectsError,
    setGitHubProjectsTruncated,
    setSelectedGitHubProjectId,
    closeDialog,
    createTaskErrorMessage,
    createTaskTitle,
    getNormalizedDescription,
    getSelectedTaskContext,
    isConfirmSelectionDisabled,
    isCreateTaskTitleEmpty,
    isDialogOpen,
    openTaskPicker,
    projects,
    projectsErrorMessage,
    selectedDescription,
    selectedContextGitHubIssue,
    selectedProject,
    selectedProjectId,
    selectedTask,
    selectedTaskId,
    setCreateTaskError,
    setCreateTaskTitle,
    setProjects,
    setProjectsError,
    setSelectedDescription,
    setSelectedProjectId,
    setSelectedTaskId,
    setTasks,
    setTasksError,
    tasks,
    tasksErrorMessage,
    validateCreateTaskInput,
  };
}

export type TopBarTaskPicker = ReturnType<typeof useTopBarTaskPicker>;
